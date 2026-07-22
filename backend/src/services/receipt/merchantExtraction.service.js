/**
 * merchantExtraction.service.js
 *
 * Extracts a best-guess merchant/store name from raw receipt OCR text.
 * Receipts almost universally print the store name in the first few lines,
 * often in a larger font that OCR renders as its own line. We score
 * candidate lines instead of blindly taking line 1, since logos/decorative
 * characters frequently OCR into garbage on the very first line.
 */

const NOISE_LINE_PATTERNS = [
  /^tax\s*invoice$/i,
  /^invoice$/i,
  /^receipt$/i,
  /^original\s*for\s*recipient$/i,
  /^gstin/i,
  /^cin\b/i,
  /^phone/i,
  /^tel\b/i,
  /^www\./i,
  /^\d{6}$/, // bare pincode
  /^date/i,
  /^bill\s*no/i,
  /^order\s*(no|id)?/i,
  /^table/i,
  /^cashier/i,
  /^\d+$/, // bare numeric line
];

const isLikelyNoise = (line) => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length < 2) return true;
  if (NOISE_LINE_PATTERNS.some((p) => p.test(trimmed))) return true;

  const digitRatio =
    (trimmed.match(/\d/g)?.length ?? 0) / trimmed.length;
  if (digitRatio > 0.5) return true;

  return false;
};

/**
 * @param {string} rawText — full OCR output for a receipt
 * @returns {{ value: string|null, confidence: number }}
 */
export const extractMerchant = (rawText) => {
  if (!rawText || typeof rawText !== "string") {
    return { value: null, confidence: 0 };
  }

  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  // Merchant name lives in the first handful of lines on virtually every
  // receipt layout (thermal POS or printed invoice alike).
  const candidates = lines.slice(0, 6).filter((line) => !isLikelyNoise(line));

  if (candidates.length === 0) {
    return { value: null, confidence: 0 };
  }

  const scored = candidates.slice(0, 3).map((line, idx) => {
    const alphaRatio =
      (line.match(/[a-zA-Z]/g)?.length ?? 0) / Math.max(line.length, 1);
    // Earlier lines are slightly favored — store names are usually first.
    const positionBonus = idx === 0 ? 0.15 : idx === 1 ? 0.08 : 0;
    return { line, score: alphaRatio + positionBonus };
  });

  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];

  const confidence = Math.min(0.95, Math.max(0.3, best.score));

  return {
    value: best.line.replace(/\s+/g, " ").trim(),
    confidence: Math.round(confidence * 100) / 100,
  };
};
