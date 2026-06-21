import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// ── Load env from backend/.env ────────────────────────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const DRY_RUN = process.argv.includes("--dry-run");
const BATCH_SIZE = 500;

const transactionSchema = new mongoose.Schema({
  merchant: String,
  normalizedMerchant: String,
});
const Transaction = mongoose.model(
  "Transaction",
  transactionSchema,
  "transactions", // explicit collection name — matches Mongoose default
);

const normalize = (value) =>
  typeof value === "string" && value.trim().length > 0
    ? value.trim().toLowerCase().replace(/\s+/g, " ")
    : null;

async function migrate() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error("❌  MONGO_URI not set in environment. Aborting.");
    process.exit(1);
  }

  console.log(`Connecting to MongoDB…${DRY_RUN ? "  [DRY RUN]" : ""}`);
  await mongoose.connect(uri);
  console.log("Connected.\n");

  const cursor = Transaction.find({
    merchant: { $type: "string" },
  }).cursor({ batchSize: BATCH_SIZE });

  let inspected = 0;
  let alreadyCorrect = 0;
  let corrected = 0;
  let errors = 0;

  const bulkOps = [];

  const flushBulk = async () => {
    if (bulkOps.length === 0) return;
    if (!DRY_RUN) {
      try {
        await Transaction.bulkWrite(bulkOps, { ordered: false });
      } catch (err) {
        console.error("  ✗  Bulk write error:", err.message);
        errors += bulkOps.length;
        bulkOps.length = 0;
        return;
      }
    }
    bulkOps.length = 0;
  };

  for await (const doc of cursor) {
    inspected++;
    const expected = normalize(doc.merchant);

    if (doc.normalizedMerchant === expected) {
      alreadyCorrect++;
      continue;
    }

    corrected++;
    bulkOps.push({
      updateOne: {
        filter: { _id: doc._id },
        update: { $set: { normalizedMerchant: expected } },
      },
    });

    if (bulkOps.length >= BATCH_SIZE) {
      await flushBulk();
    }
  }

  await flushBulk();

  console.log(`
─────────────────────────────────────────
Migration complete — Transaction.normalizedMerchant backfill
─────────────────────────────────────────
  Inspected (merchant set)  : ${inspected}
  Already correct           : ${alreadyCorrect}
  Corrected${DRY_RUN ? " (would be)" : ""}                 : ${corrected}
  Errors                    : ${errors}
─────────────────────────────────────────${DRY_RUN ? "\n  DRY RUN — no documents were modified.\n" : ""}`);

  if (errors > 0) {
    process.exitCode = 1;
  }

  await mongoose.disconnect();
}

migrate().catch((err) => {
  console.error("Fatal migration error:", err);
  process.exitCode = 1;
  mongoose.disconnect();
});
