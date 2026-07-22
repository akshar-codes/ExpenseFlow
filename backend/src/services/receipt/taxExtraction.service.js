/**
 * taxExtraction.service.js
 *
 * Extracts the total tax amount from raw receipt OCR text. Indian receipts
 * commonly split GST across CGST + SGST (or a single IGST) line items —
 * this sums every matched tax line rather than taking only the first match,
 * so a CGST+SGST split still yields the correct combined tax total.
 */

const TAX_KEYWORDS = [
  /c\.?\s*gst/i,
  /s\.?\s*gst/i,
  /i\.?\s*gst/i,
  /^gst\b/i,
  /\bvat\b/i,
  /service\s*tax/i,
];

const AMOUNT_REGEX =
  /(?:rs\.?|inr|₹)?\s*(\d{1,3}(?:,\d{2,3})*(?:\.\d{1,2})?|\d+\.\d{2})/i;

const parseNumber = (raw) => {
  const cleaned = raw.replace(/,/g, "");
  const num = parseFloat(cleaned);
  return isFinite(num) ? num : null;
};

/**
 * @param {string} rawText — full OCR output for a receipt
 * @returns {{ value: number|null, confidence: number }}
 */
export const extractTax = (rawText) => {
  if (!rawText || typeof rawText !== "string") {
    return { value: null, confidence: 0 };
  }

  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  let total = 0;
  let matchedLines = 0;

  for (const line of lines) {
    if (TAX_KEYWORDS.some((p) => p.test(line))) {
      const match = line.match(AMOUNT_REGEX);
      if (match) {
        const value = parseNumber(match[1]);
        if (value != null && value >= 0) {
          total += value;
          matchedLines += 1;
        }
      }
    }
  }

  if (matchedLines === 0) {
    return { value: null, confidence: 0 };
  }

  return {
    value: Math.round(total * 100) / 100,
    // Two+ matched lines (e.g. CGST + SGST both found) is a stronger signal
    // than a single isolated match.
    confidence: matchedLines >= 2 ? 0.8 : 0.6,
  };
};
