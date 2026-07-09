import Transaction from "../../models/Transaction.js";
import { normalizeMerchant } from "./merchantRecognition.service.js";

const buildFingerprint = ({ date, type, amount, merchant, description }) => {
  const dayKey = date.toISOString().slice(0, 10);
  const merchantKey =
    normalizeMerchant(merchant) || normalizeMerchant(description) || "";
  return `${dayKey}|${type}|${amount.toFixed(2)}|${merchantKey}`;
};

/**
 * Build a duplicate-checking predicate for a batch of candidate rows.
 */
export const createDuplicateChecker = async (userId, candidateRows) => {
  const dates = candidateRows.map((r) => r.date).filter(Boolean);

  const seenInBatch = new Set();

  if (dates.length === 0) {
    return (row) => {
      const fp = buildFingerprint(row);
      if (seenInBatch.has(fp)) return true;
      seenInBatch.add(fp);
      return false;
    };
  }

  const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
  const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));

  const existing = await Transaction.find({
    user: userId,
    date: { $gte: minDate, $lte: maxDate },
  })
    .select("date type amount note merchant")
    .lean();

  const existingFingerprints = new Set(
    existing.map((tx) =>
      buildFingerprint({
        date: tx.date,
        type: tx.type,
        amount: tx.amount,
        merchant: tx.merchant,
        description: tx.note,
      }),
    ),
  );

  return (row) => {
    const fp = buildFingerprint(row);
    if (existingFingerprints.has(fp) || seenInBatch.has(fp)) {
      return true;
    }
    seenInBatch.add(fp);
    return false;
  };
};
