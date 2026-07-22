/**
 * OCRProviderFactory
 *
 * Reads OCR_PROVIDER from the environment and returns the correct provider
 * instance. All provider construction happens here — services and
 * controllers import ONLY this factory, never a concrete provider class
 * directly. This is what makes the OCR engine swappable later: to add a
 * cloud provider (e.g. Google Vision, AWS Textract), implement OCRProvider
 * in a new file under ./providers/ and register it in PROVIDERS below.
 *
 * Supported providers:
 *   tesseract  (default) — local, no external dependency or API key
 *
 * Usage:
 *   import { getOCRProvider } from "./OCRProviderFactory.js";
 *   const provider = getOCRProvider();
 *   const result   = await provider.extractText(imageBuffer);
 */

import { TesseractProvider } from "./providers/TesseractProvider.js";
import logger from "../../config/logger.js";

// ── Registry ──────────────────────────────────────────────────────────────────

const PROVIDERS = {
  tesseract: (cfg) => new TesseractProvider(cfg),
  // googlevision: (cfg) => new GoogleVisionProvider(cfg),
  // awstextract:  (cfg) => new AwsTextractProvider(cfg),
};

// ── Singleton cache ────────────────────────────────────────────────────────────

let _instance = null;

export const getOCRProvider = (config = {}) => {
  if (_instance) return _instance;

  const providerKey = (
    config.provider ||
    process.env.OCR_PROVIDER ||
    "tesseract"
  ).toLowerCase();

  const factory = PROVIDERS[providerKey];

  if (!factory) {
    const supported = Object.keys(PROVIDERS).join(", ");
    throw new Error(
      `OCRProviderFactory: unknown provider "${providerKey}". ` +
        `Supported: ${supported}. Set OCR_PROVIDER in your .env.`,
    );
  }

  logger.info(
    { provider: providerKey },
    "OCRProviderFactory: initialising OCR provider",
  );

  _instance = factory(config);
  return _instance;
};

/**
 * Reset the singleton. Call this in tests or after swapping providers at runtime.
 */
export const resetOCRProvider = () => {
  _instance = null;
};

/**
 * Convenience: return the name of the active provider without constructing it.
 */
export const getActiveOCRProviderName = () =>
  (process.env.OCR_PROVIDER || "tesseract").toLowerCase();
