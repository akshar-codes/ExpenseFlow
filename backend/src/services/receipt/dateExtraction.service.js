/**
 * dateExtraction.service.js
 *
 * Extracts the transaction date from raw receipt OCR text. Deliberately
 * reuses parseDateFlexible() from the CSV import parser rather than
 * duplicating date-format handling — receipts and bank statement rows use
 * the same set of Indian date conventions (DD/MM/YYYY, DD-Mon-YYYY, ISO).
 */
import { parseDateFlexible } from "../import/parsers/baseParser.js";

const DATE_LINE_HINTS = [/date/i, /dt\.?\s*:/i];

// Matches the date substring within a line so we can hand a clean,
// digit-leading fragment to parseDateFlexible (which anchors on the start
// of the string).
const DATE_SUBSTRING_PATTERN =
  /(\d{4}-\d{1,2}-\d{1,2})|(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})|(\d{1,2}[\s-][A-Za-z]{3,}[\s-]\d{2,4})/;

const tryParseLine = (line) => {
  const match = line.match(DATE_SUBSTRING_PATTERN);
  if (!match) return null;
  return parseDateFlexible(match[0]);
};

/**
 * @param {string} rawText — full OCR output for a receipt
 * @returns {{ value: Date|null, confidence: number }}
 */
export const extractDate = (rawText) => {
  if (!rawText || typeof rawText !== "string") {
    return { value: null, confidence: 0 };
  }

  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const now = new Date();

  // Pass 1: lines explicitly labeled as a date.
  for (const line of lines) {
    if (DATE_LINE_HINTS.some((p) => p.test(line))) {
      const parsed = tryParseLine(line);
      if (parsed && !isNaN(parsed.getTime()) && parsed <= now) {
        return { value: parsed, confidence: 0.85 };
      }
    }
  }

  // Pass 2: scan every line for the first valid, non-future date found.
  // Receipts rarely contain more than one real calendar date.
  for (const line of lines) {
    const parsed = tryParseLine(line);
    if (parsed && !isNaN(parsed.getTime()) && parsed <= now) {
      return { value: parsed, confidence: 0.5 };
    }
  }

  return { value: null, confidence: 0 };
};
