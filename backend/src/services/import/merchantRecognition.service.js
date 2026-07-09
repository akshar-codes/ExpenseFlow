const BANK_PREFIX_PATTERNS = [
  /^UPI[-/]/i,
  /^NEFT[-/]/i,
  /^IMPS[-/]/i,
  /^RTGS[-/]/i,
  /^POS\s*/i,
  /^ATM[-\s]?/i,
];

const WALLET_PATTERNS = [
  { regex: /paid to\s+(.+?)(?:\s+via|\s+using|\s+upi|$)/i },
  { regex: /payment to\s+(.+?)(?:\s+via|\s+using|$)/i },
  { regex: /received from\s+(.+?)(?:\s+via|\s+using|$)/i },
  { regex: /sent to\s+(.+?)(?:\s+via|\s+using|$)/i },
  { regex: /money transfer to\s+(.+?)(?:\s+via|$)/i },
];

/**
 * Bank statements often encode the merchant inside a slash-delimited
 * narration, e.g. "UPI/SWIGGYINDIA/9988776655/Payment". Strip the leading
 * rail identifier, then take the first meaningful slash-delimited segment.
 */
const cleanBankDescription = (description) => {
  let value = description;

  BANK_PREFIX_PATTERNS.forEach((pattern) => {
    value = value.replace(pattern, "");
  });

  const parts = value
    .split("/")
    .map((p) => p.trim())
    .filter(Boolean);

  if (parts.length > 1) {
    return parts[0];
  }

  return value.trim();
};

/**
 * Extract a best-guess merchant name from a transaction description.
 * Returns null when no meaningful text is available.
 */
export const extractMerchant = (description) => {
  if (!description) return null;

  for (const { regex } of WALLET_PATTERNS) {
    const match = description.match(regex);
    if (match?.[1]) {
      return match[1].trim();
    }
  }

  const cleaned = cleanBankDescription(description);
  return cleaned || null;
};

/**
 * Normalize a merchant string for comparison/dedup purposes. Matches the
 * casing/whitespace rules used by Transaction.normalizedMerchant.
 */
export const normalizeMerchant = (merchant) =>
  typeof merchant === "string" && merchant.trim().length > 0
    ? merchant.trim().toLowerCase().replace(/\s+/g, " ")
    : null;
