import mongoose from "mongoose";
import { IMPORT_SOURCE } from "../utils/constants.js";

const transactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: ["income", "expense"],
      required: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },

    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },

    note: {
      type: String,
      trim: true,
      maxlength: 200,
      default: "",
    },

    // ── Merchant (added for Phase 1 of the analytics build-out) ───────────

    merchant: {
      type: String,
      trim: true,
      maxlength: 100,
      default: null,
    },

    normalizedMerchant: {
      type: String,
      default: null,
      index: true,
    },

    date: {
      type: Date,
      default: Date.now,
      validate: {
        validator(value) {
          return value <= new Date();
        },
        message: "Date cannot be in the future",
      },
    },

    paymentMethod: {
      type: String,
      enum: ["cash", "upi", "card", "bank"],
      default: "upi",
    },

    sourceRecurringId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RecurringTransaction",
    },

    // ── CSV import lineage (additive — both optional, default null) ───────
    importBatchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ImportBatch",
      default: null,
      index: true,
    },

    importSource: {
      type: String,
      enum: [...Object.values(IMPORT_SOURCE), null],
      default: null,
    },
  },
  { timestamps: true },
);

// ─── Derive normalizedMerchant whenever merchant changes ──────────────────

const normalize = (value) =>
  typeof value === "string" && value.trim().length > 0
    ? value.trim().toLowerCase().replace(/\s+/g, " ")
    : null;

transactionSchema.pre("save", function (next) {
  if (this.isModified("merchant")) {
    this.normalizedMerchant = normalize(this.merchant);
  }
  next();
});

transactionSchema.pre(["findOneAndUpdate", "updateOne"], function (next) {
  const update = this.getUpdate();
  const setOps = update.$set ?? update;
  if (Object.prototype.hasOwnProperty.call(setOps, "merchant")) {
    setOps.normalizedMerchant = normalize(setOps.merchant);
    if (update.$set) update.$set = setOps;
    this.setUpdate(update);
  }
  next();
});

// ─── Indexes (existing, unchanged) ─────────────────────────────────────────

// Primary query: user + date (list / sort by date)
transactionSchema.index({ user: 1, date: -1 });

// Filter by type within a user
transactionSchema.index({ user: 1, type: 1, date: -1 });

// Filter by category within a user
transactionSchema.index({ user: 1, category: 1, date: -1 });

// Combined type + category filter
transactionSchema.index({ user: 1, type: 1, category: 1, date: -1 });

// Amount-based sorting
transactionSchema.index({ user: 1, amount: -1 });

// createdAt-based ordering
transactionSchema.index({ user: 1, createdAt: -1 });

// ── Idempotency index (cron job deduplication) ────────────────────────────────

transactionSchema.index(
  { sourceRecurringId: 1, date: 1 },
  {
    unique: true,
    partialFilterExpression: { sourceRecurringId: { $type: "objectId" } },
    name: "recurring_idempotency_idx",
  },
);

transactionSchema.index(
  { user: 1, normalizedMerchant: 1, date: -1 },
  { name: "user_merchant_date_idx", sparse: true },
);

transactionSchema.index(
  { user: 1, type: 1, date: -1, amount: -1 },
  { name: "user_type_date_amount_idx" },
);

// ── Import batch lookup (used by rollback to delete a batch's rows) ───────
transactionSchema.index(
  { importBatchId: 1 },
  { name: "import_batch_idx", sparse: true },
);

export default mongoose.model("Transaction", transactionSchema);
