import mongoose from "mongoose";

export const RECEIPT_STATUS = Object.freeze({
  PROCESSING: "processing",
  PROCESSED: "processed",
  FAILED: "failed",
  CONFIRMED: "confirmed",
});

const extractedFieldSchema = new mongoose.Schema(
  {
    value: { type: mongoose.Schema.Types.Mixed, default: null },
    confidence: { type: Number, default: 0, min: 0, max: 1 },
  },
  { _id: false },
);

const receiptSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    originalFileName: {
      type: String,
      trim: true,
      maxlength: 255,
      default: "",
    },

    // Local disk path today (see utils/receiptStorage.js). Kept as an
    // opaque string so a future S3-backed storage module is a drop-in swap.
    filePath: { type: String, required: true },
    mimeType: { type: String, required: true },
    fileSizeBytes: { type: Number, required: true },

    status: {
      type: String,
      enum: Object.values(RECEIPT_STATUS),
      default: RECEIPT_STATUS.PROCESSING,
    },

    ocrProvider: { type: String, default: null },
    ocrRawText: { type: String, default: "" },
    ocrConfidence: { type: Number, default: null },

    extracted: {
      merchant: { type: extractedFieldSchema, default: () => ({}) },
      amount: { type: extractedFieldSchema, default: () => ({}) },
      date: { type: extractedFieldSchema, default: () => ({}) },
      tax: { type: extractedFieldSchema, default: () => ({}) },
    },

    // Populated once the receipt is confirmed into a real Transaction.
    transaction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Transaction",
      default: null,
    },

    error: { type: String, default: null },
  },
  { timestamps: true },
);

// Primary query: a user's receipt history, most recent first.
receiptSchema.index({ user: 1, createdAt: -1 });
receiptSchema.index({ user: 1, status: 1 });

export default mongoose.model("Receipt", receiptSchema);
