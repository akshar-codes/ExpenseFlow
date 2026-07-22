import mongoose from "mongoose";
import Receipt, { RECEIPT_STATUS } from "../models/Receipt.js";
import Category from "../models/Category.js";
import { getOCRProvider } from "./ocr/OCRProviderFactory.js";
import { parseReceiptText } from "./receipt/receiptParser.service.js";
import {
  saveReceiptFile,
  deleteReceiptFile,
  readReceiptFile,
} from "../utils/receiptStorage.js";
import { createTransactionService } from "./transaction.service.js";
import { ServiceError } from "../utils/ServiceError.js";
import cache from "../utils/cache.js";
import logger from "../config/logger.js";

const toDbField = ({ value, confidence } = {}) => ({
  value: value ?? null,
  confidence: confidence ?? 0,
});

// ─── SCAN (upload + OCR + parse) ──────────────────────────────────────────────

export const scanReceiptService = async (userId, file) => {
  if (!file?.buffer) {
    throw new ServiceError("No receipt image provided", 400);
  }

  const { filePath, fileName } = await saveReceiptFile(
    userId,
    file.buffer,
    file.mimetype,
  );

  const receipt = await Receipt.create({
    user: userId,
    originalFileName: file.originalname || fileName,
    filePath,
    mimeType: file.mimetype,
    fileSizeBytes: file.size,
    status: RECEIPT_STATUS.PROCESSING,
  });

  try {
    const provider = getOCRProvider();
    const ocrResult = await provider.extractText(file.buffer);

    if (!ocrResult.success) {
      receipt.status = RECEIPT_STATUS.FAILED;
      receipt.error = ocrResult.error || "OCR extraction failed";
      await receipt.save();
      return receipt;
    }

    const parsed = parseReceiptText(ocrResult.text);

    receipt.ocrProvider = provider.name;
    receipt.ocrRawText = ocrResult.text;
    receipt.ocrConfidence = ocrResult.confidence;
    receipt.extracted = {
      merchant: toDbField(parsed.merchant),
      amount: toDbField(parsed.amount),
      date: toDbField(parsed.date),
      tax: toDbField(parsed.tax),
    };
    receipt.status = RECEIPT_STATUS.PROCESSED;
    await receipt.save();

    logger.info(
      {
        receiptId: receipt._id,
        userId: String(userId),
        provider: provider.name,
      },
      "receipt.service: receipt scanned successfully",
    );

    return receipt;
  } catch (err) {
    receipt.status = RECEIPT_STATUS.FAILED;
    receipt.error = err.message;
    await receipt.save();

    logger.error(
      { err, receiptId: receipt._id, userId: String(userId) },
      "receipt.service: OCR/parse failed",
    );

    throw new ServiceError("Failed to process receipt image", 502);
  }
};

// ─── LIST / GET ────────────────────────────────────────────────────────────────

export const listReceiptsService = async (userId, query = {}) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(query.limit, 10) || 10));
  const skip = (page - 1) * limit;

  const filter = { user: userId };
  if (query.status) filter.status = query.status;

  const [receipts, total] = await Promise.all([
    Receipt.find(filter)
      .select("-ocrRawText")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Receipt.countDocuments(filter),
  ]);

  return {
    receipts,
    pagination: { total, page, limit, pages: Math.ceil(total / limit) || 0 },
  };
};

export const getReceiptService = async (userId, receiptId) => {
  if (!mongoose.Types.ObjectId.isValid(receiptId)) {
    throw new ServiceError("Invalid receipt id", 400);
  }
  const receipt = await Receipt.findOne({ _id: receiptId, user: userId });
  if (!receipt) throw new ServiceError("Receipt not found", 404);
  return receipt;
};

export const getReceiptImageService = async (userId, receiptId) => {
  const receipt = await getReceiptService(userId, receiptId);
  const buffer = await readReceiptFile(receipt.filePath);
  return { buffer, mimeType: receipt.mimeType };
};

// ─── UPDATE EXTRACTED FIELDS (pre-confirm editing) ────────────────────────────

export const updateExtractedFieldsService = async (
  userId,
  receiptId,
  patch,
) => {
  const receipt = await getReceiptService(userId, receiptId);

  if (receipt.status === RECEIPT_STATUS.CONFIRMED) {
    throw new ServiceError(
      "This receipt has already been confirmed into a transaction",
      400,
    );
  }

  const editableFields = ["merchant", "amount", "date", "tax"];
  editableFields.forEach((field) => {
    if (patch[field] !== undefined) {
      // A user-provided correction is treated as fully confident.
      receipt.extracted[field] = { value: patch[field], confidence: 1 };
    }
  });

  await receipt.save();
  return receipt;
};

// ─── CONFIRM (create Transaction from receipt) ────────────────────────────────

export const confirmReceiptService = async (userId, receiptId, body) => {
  const receipt = await getReceiptService(userId, receiptId);

  if (receipt.status === RECEIPT_STATUS.CONFIRMED) {
    throw new ServiceError(
      "This receipt has already been confirmed into a transaction",
      400,
    );
  }

  const { categoryId, amount, merchant, date, tax, note, paymentMethod } = body;

  const category = await Category.findOne({ _id: categoryId, user: userId });
  if (!category) {
    throw new ServiceError(
      "Category not found or does not belong to you",
      404,
    );
  }
  if (category.type !== "expense") {
    throw new ServiceError(
      "Receipts can only be linked to expense categories",
      400,
    );
  }

  const transactionPayload = {
    type: "expense",
    amount: Number(amount),
    category: categoryId,
    date,
    note: note || merchant || "",
    merchant: merchant || null,
    paymentMethod: paymentMethod || "cash",
    // NOTE: requires a `sourceReceiptId` field on the Transaction schema
    // (same pattern as the existing `sourceRecurringId` field).
    sourceReceiptId: receipt._id,
  };

  const result = await createTransactionService(userId, transactionPayload);
  const createdTransaction = result.transaction || result;

  receipt.transaction = createdTransaction._id;
  receipt.status = RECEIPT_STATUS.CONFIRMED;
  receipt.extracted.merchant = {
    value: merchant ?? receipt.extracted.merchant?.value ?? null,
    confidence: 1,
  };
  receipt.extracted.amount = { value: Number(amount), confidence: 1 };
  receipt.extracted.date = { value: date, confidence: 1 };
  receipt.extracted.tax = {
    value: tax ?? receipt.extracted.tax?.value ?? null,
    confidence: 1,
  };
  await receipt.save();

  cache.invalidateUser(userId);

  logger.info(
    {
      receiptId: receipt._id,
      transactionId: createdTransaction._id,
      userId: String(userId),
    },
    "receipt.service: receipt confirmed into transaction",
  );

  return { receipt, transaction: createdTransaction };
};

// ─── DELETE ────────────────────────────────────────────────────────────────────

export const deleteReceiptService = async (userId, receiptId) => {
  const receipt = await getReceiptService(userId, receiptId);

  if (receipt.status === RECEIPT_STATUS.CONFIRMED) {
    throw new ServiceError(
      "Cannot delete a receipt that has already been confirmed into a " +
        "transaction. Delete the transaction instead.",
      400,
    );
  }

  await deleteReceiptFile(receipt.filePath);
  await receipt.deleteOne();
};
