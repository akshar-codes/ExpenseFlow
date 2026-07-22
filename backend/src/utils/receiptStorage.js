import fs from "fs/promises";
import fsSync from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Receipts are stored on local disk under backend/generated-receipts/<userId>/.
// Every function here operates on a plain filePath string so this module can
// be swapped for an S3-backed implementation later without touching callers
// (mirrors the reportStorage.js pattern used by the PDF Report Center).

const RECEIPTS_ROOT = path.resolve(__dirname, "../../generated-receipts");

const ALLOWED_EXTENSIONS = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

export const ensureReceiptDir = async (userId) => {
  const dir = path.join(RECEIPTS_ROOT, String(userId));
  await fs.mkdir(dir, { recursive: true });
  return dir;
};

export const saveReceiptFile = async (userId, buffer, mimeType) => {
  const ext = ALLOWED_EXTENSIONS[mimeType];
  if (!ext) {
    throw new Error(`Unsupported receipt mime type: ${mimeType}`);
  }

  const dir = await ensureReceiptDir(userId);
  const fileName = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${ext}`;
  const filePath = path.join(dir, fileName);

  await fs.writeFile(filePath, buffer);

  return { filePath, fileName };
};

export const readReceiptFile = async (filePath) => fs.readFile(filePath);

export const deleteReceiptFile = async (filePath) => {
  try {
    if (fsSync.existsSync(filePath)) {
      await fs.unlink(filePath);
    }
  } catch (err) {
    // Non-fatal — the Receipt document is the source of truth for the API;
    // a stray file can be cleaned up manually or by a future retention job.
    console.warn(
      `[receiptStorage] Failed to delete file ${filePath}:`,
      err.message,
    );
  }
};
