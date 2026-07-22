/**
 * receiptParser.service.js
 *
 * Orchestrates the individual field-extraction services against a single
 * block of raw OCR text. Kept deliberately thin — each extractor owns its
 * own domain logic and can be tested/tuned independently.
 */
import { extractMerchant } from "./merchantExtraction.service.js";
import { extractAmount } from "./amountExtraction.service.js";
import { extractDate } from "./dateExtraction.service.js";
import { extractTax } from "./taxExtraction.service.js";

/**
 * @param {string} rawText — full OCR output for a receipt
 * @returns {{
 *   merchant: { value: string|null, confidence: number },
 *   amount:   { value: number|null, confidence: number },
 *   date:     { value: Date|null, confidence: number },
 *   tax:      { value: number|null, confidence: number },
 * }}
 */
export const parseReceiptText = (rawText) => {
  return {
    merchant: extractMerchant(rawText),
    amount: extractAmount(rawText),
    date: extractDate(rawText),
    tax: extractTax(rawText),
  };
};
