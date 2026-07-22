/**
 * amountExtraction.service.js
 *
 * Extracts the receipt's total/grand-total amount from raw OCR text using a
 * layered strategy, from most to least reliable:
 *   1. A "total"-style keyword and an amount on the SAME line.
 *   2. A "total"-style keyword line followed by an amount on the NEXT line
 *      (common two-column receipt layouts collapse into two OCR lines).
 *   3. Fallback: the largest currency-looking amount anywhere in the
 *      document — on a receipt the grand total is very often the single
 *      largest number printed.
 */

const TOTAL_KEYWORDS = [
  /grand\s*total/i,
  /net\s*amount/i,
  /amount\s*due/i,
  /balance\s*due/i,
  /total\s*payable/i,
  /^total\b/i,
];

const AMOUNT_REGEX =
  /(?:rs\.?|inr|₹)?\s*(\d{1,3}(?:,\d{2,3})*(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)/i;

const ALL_AMOUNTS_REGEX =
  /(?:rs\.?|inr|₹)?\s*(\d{1,3}(?:,\d{2,3})*(?:\.\d{1,2})?|\d+\.\d{2})/gi;

const parseNumber = (raw) => {
  const cleaned = raw.replace(/,/g, "");
  const num = parseFloat(cleaned);
  return isFinite(num) ? num : null;
};

const extractAllAmounts = (text) => {
  const matches = [];
  let m;
  // Reset lastIndex isn't needed — a fresh regex literal is created each call.
  const regex = new RegExp(ALL_AMOUNTS_REGEX);
  while ((m = regex.exec(text)) !== null) {
    const value = parseNumber(m[1]);
    if (value != null && value > 0) matches.push(value);
  }
  return matches;
};

/**
 * @param {string} rawText — full OCR output for a receipt
 * @returns {{ value: number|null, confidence: number }}
 */
export const extractAmount = (rawText) => {
  if (!rawText || typeof rawText !== "string") {
    return { value: null, confidence: 0 };
  }

  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  // Pass 1: keyword + amount on the same line.
  for (const line of lines) {
    if (TOTAL_KEYWORDS.some((p) => p.test(line))) {
      const match = line.match(AMOUNT_REGEX);
      if (match) {
        const value = parseNumber(match[1]);
        if (value != null && value > 0) {
          return { value: Math.round(value * 100) / 100, confidence: 0.9 };
        }
      }
    }
  }

  // Pass 2: keyword line immediately followed by an amount-only line.
  for (let i = 0; i < lines.length - 1; i++) {
    if (TOTAL_KEYWORDS.some((p) => p.test(lines[i]))) {
      const match = lines[i + 1].match(AMOUNT_REGEX);
      if (match) {
        const value = parseNumber(match[1]);
        if (value != null && value > 0) {
          return { value: Math.round(value * 100) / 100, confidence: 0.75 };
        }
      }
    }
  }

  // Pass 3: fallback — largest amount anywhere in the document.
  const allAmounts = extractAllAmounts(rawText);
  if (allAmounts.length > 0) {
    const max = Math.max(...allAmounts);
    return { value: Math.round(max * 100) / 100, confidence: 0.4 };
  }

  return { value: null, confidence: 0 };
};
