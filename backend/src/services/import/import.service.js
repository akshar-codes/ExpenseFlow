import mongoose from "mongoose";
import Transaction from "../../models/Transaction.js";
import ImportBatch from "../../models/ImportBatch.js";
import { ServiceError } from "../../utils/ServiceError.js";
import { IMPORT_STATUS, BANK_SOURCES } from "../../utils/constants.js";
import cache from "../../utils/cache.js";
import {
  resolveParser,
  tokenizeCsv,
  buildColumnMapping,
  normalizeRows,
} from "./csvParsing.service.js";
import { extractMerchant } from "./merchantRecognition.service.js";
import { suggestCategory } from "./categorySuggestion.service.js";
import { createDuplicateChecker } from "./duplicateDetection.service.js";

const PREVIEW_ROW_LIMIT = 25;
const MAX_STORED_ERRORS = 200;

const paymentMethodForSource = (source) =>
  BANK_SOURCES.includes(source) ? "bank" : "upi";

// ─── PREVIEW ──────────────────────────────────────────────────────────────
// Read-only: parses a sample of rows so the frontend can render the column
// mapping + preview table before anything is written to the database.

export const previewImportService = async (
  userId,
  { source, csvContent, columnMapping },
) => {
  const parser = resolveParser(source);
  const { headers, rows } = tokenizeCsv(csvContent);

  if (rows.length === 0) {
    throw new ServiceError("CSV file contains no data rows", 400);
  }

  const resolvedMap = buildColumnMapping(parser, headers, columnMapping);
  const detectionScore = Math.min(1, Math.max(0, parser.detect(headers)));

  const previewSlice = rows.slice(0, PREVIEW_ROW_LIMIT);
  const normalized = normalizeRows(parser, previewSlice, resolvedMap);

  const previewRows = normalized.map((entry) => ({
    rowNumber: entry.rowNumber,
    date: entry.normalized.date,
    description: entry.normalized.description,
    merchant: extractMerchant(entry.normalized.description),
    amount: entry.normalized.amount,
    type: entry.normalized.type,
    valid: entry.valid,
    errors: entry.errors,
  }));

  return {
    source,
    detectionScore,
    headers,
    columnMapping: resolvedMap,
    availableFields: [
      "date",
      "description",
      "debit",
      "credit",
      "amount",
      "type",
      "refNo",
      "balance",
    ],
    totalRows: rows.length,
    previewRows,
    previewErrorCount: previewRows.filter((r) => !r.valid).length,
  };
};

// ─── COMMIT ───────────────────────────────────────────────────────────────

export const commitImportService = async (
  userId,
  { source, csvContent, columnMapping, fileName, skipDuplicates = true },
) => {
  const parser = resolveParser(source);
  const { headers, rows } = tokenizeCsv(csvContent);

  if (rows.length === 0) {
    throw new ServiceError("CSV file contains no data rows", 400);
  }

  const resolvedMap = buildColumnMapping(parser, headers, columnMapping);
  const normalized = normalizeRows(parser, rows, resolvedMap);

  const batch = await ImportBatch.create({
    user: userId,
    source,
    fileName: fileName || `${source}-import.csv`,
    status: IMPORT_STATUS.PROCESSING,
    totalRows: rows.length,
    columnMapping: resolvedMap,
  });

  const validEntries = normalized.filter((entry) => entry.valid);
  const invalidEntries = normalized.filter((entry) => !entry.valid);

  const duplicateChecker = await createDuplicateChecker(
    userId,
    validEntries.map((e) => e.normalized),
  );

  const toInsert = [];
  const skippedDuplicateRows = [];
  let categoryAutoAssignedCount = 0;

  for (const entry of validEntries) {
    const merchant = extractMerchant(entry.normalized.description);

    const isDuplicate = duplicateChecker({
      date: entry.normalized.date,
      type: entry.normalized.type,
      amount: entry.normalized.amount,
      merchant,
      description: entry.normalized.description,
    });

    if (isDuplicate) {
      skippedDuplicateRows.push(entry.rowNumber);
      if (!skipDuplicates) {
        invalidEntries.push({
          ...entry,
          errors: [`Row ${entry.rowNumber}: duplicate transaction detected`],
        });
      }
      continue;
    }

    const { categoryId, autoAssigned } = await suggestCategory(userId, {
      merchant,
      description: entry.normalized.description,
      type: entry.normalized.type,
    });

    if (autoAssigned) categoryAutoAssignedCount += 1;

    toInsert.push({
      user: userId,
      type: entry.normalized.type,
      amount: entry.normalized.amount,
      category: categoryId,
      note: (entry.normalized.description || "").slice(0, 200),
      merchant: merchant ? merchant.slice(0, 100) : null,
      date: entry.normalized.date,
      paymentMethod: paymentMethodForSource(source),
      importBatchId: batch._id,
      importSource: source,
    });
  }

  let insertedCount = 0;
  let insertErrors = [];

  if (toInsert.length > 0) {
    try {
      const result = await Transaction.insertMany(toInsert, { ordered: false });
      insertedCount = result.length;
    } catch (err) {
      insertedCount = err.insertedDocs?.length ?? 0;
      insertErrors = (err.writeErrors ?? []).map(
        (e) =>
          `Insert error at row offset ${e.index}: ${
            e.errmsg || e.err?.errmsg || "unknown error"
          }`,
      );
    }
  }

  const finalErrors = [
    ...invalidEntries.flatMap((e) => e.errors),
    ...insertErrors,
  ];

  batch.status = IMPORT_STATUS.COMPLETED;
  batch.importedCount = insertedCount;
  batch.duplicateRows = skippedDuplicateRows.length;
  batch.errorRows = invalidEntries.length;
  batch.categoryAutoAssignedCount = categoryAutoAssignedCount;
  batch.errors = finalErrors.slice(0, MAX_STORED_ERRORS);
  await batch.save();

  cache.invalidateUser(userId);

  return {
    batchId: batch._id,
    status: batch.status,
    totalRows: rows.length,
    importedCount: insertedCount,
    duplicateCount: skippedDuplicateRows.length,
    errorCount: invalidEntries.length,
    categoryAutoAssignedCount,
    errors: batch.errors,
  };
};

// ─── LIST / GET ───────────────────────────────────────────────────────────

export const listImportBatchesService = async (userId) =>
  ImportBatch.find({ user: userId }).sort({ createdAt: -1 }).limit(100);

export const getImportBatchService = async (userId, batchId) => {
  if (!mongoose.Types.ObjectId.isValid(batchId)) {
    throw new ServiceError("Invalid import batch id", 400);
  }

  const batch = await ImportBatch.findOne({ _id: batchId, user: userId });
  if (!batch) {
    throw new ServiceError("Import batch not found", 404);
  }

  return batch;
};

// ─── ROLLBACK ─────────────────────────────────────────────────────────────

export const rollbackImportService = async (userId, batchId) => {
  const batch = await getImportBatchService(userId, batchId);

  if (batch.status === IMPORT_STATUS.ROLLED_BACK) {
    throw new ServiceError("This import has already been rolled back", 400);
  }

  const session = await mongoose.startSession();
  let deletedCount = 0;

  try {
    await session.withTransaction(async () => {
      const result = await Transaction.deleteMany(
        { user: userId, importBatchId: batch._id },
        { session },
      );
      deletedCount = result.deletedCount;

      batch.status = IMPORT_STATUS.ROLLED_BACK;
      batch.rolledBackAt = new Date();
      await batch.save({ session });
    });
  } catch (err) {
    if (
      err.codeName === "CommandNotSupportedOnStandalone" ||
      err.message?.includes("Transaction numbers") ||
      err.message?.includes("standalone")
    ) {
      const result = await Transaction.deleteMany({
        user: userId,
        importBatchId: batch._id,
      });
      deletedCount = result.deletedCount;

      batch.status = IMPORT_STATUS.ROLLED_BACK;
      batch.rolledBackAt = new Date();
      await batch.save();
    } else {
      throw err;
    }
  } finally {
    session.endSession();
  }

  cache.invalidateUser(userId);

  return { batchId: batch._id, deletedCount, status: batch.status };
};
