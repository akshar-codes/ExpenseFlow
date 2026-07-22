import { createWorker } from "tesseract.js";
import { OCRProvider } from "../OCRProvider.js";
import logger from "../../../config/logger.js";

const DEFAULT_LANG = process.env.OCR_LANG || "eng";
const RECOGNITION_TIMEOUT_MS = 45_000;

/**
 * TesseractProvider — local, offline OCR via tesseract.js. No API key or
 * external network call required, which makes it a safe default for a
 * self-hosted deployment. Swap for a cloud provider later by registering a
 * new OCRProvider implementation in OCRProviderFactory.js — nothing that
 * calls getOCRProvider() needs to change.
 */
export class TesseractProvider extends OCRProvider {
  constructor(config = {}) {
    super(config);
    this._lang = config.lang || DEFAULT_LANG;
  }

  get name() {
    return "tesseract";
  }

  async extractText(imageBuffer, options = {}) {
    const startMs = Date.now();
    const lang = options.lang || this._lang;

    let worker;
    try {
      worker = await createWorker(lang);

      const recognizePromise = worker.recognize(imageBuffer);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () =>
            reject(
              new Error(
                `TesseractProvider: OCR timed out after ${RECOGNITION_TIMEOUT_MS}ms`,
              ),
            ),
          RECOGNITION_TIMEOUT_MS,
        ),
      );

      const { data } = await Promise.race([recognizePromise, timeoutPromise]);

      const latencyMs = Date.now() - startMs;

      logger.info(
        {
          provider: this.name,
          lang,
          confidence: data.confidence,
          latencyMs,
        },
        "TesseractProvider: OCR complete",
      );

      return {
        success: true,
        text: data.text || "",
        confidence: typeof data.confidence === "number" ? data.confidence : null,
        meta: { provider: this.name, lang, latencyMs },
      };
    } catch (err) {
      logger.error(
        { err: err.message, provider: this.name },
        "TesseractProvider: OCR failed",
      );
      return {
        success: false,
        text: "",
        confidence: null,
        error: err.message,
        meta: { provider: this.name, lang },
      };
    } finally {
      if (worker) {
        try {
          await worker.terminate();
        } catch {
          // Non-fatal — worker process cleanup failure shouldn't mask the
          // real result/error already captured above.
        }
      }
    }
  }

  /**
   * Verifies the OCR engine can initialise (downloads/loads language data
   * on first run). Does not process any image.
   */
  async healthCheck() {
    const startMs = Date.now();
    let worker;
    try {
      worker = await createWorker(this._lang);
      return {
        ok: true,
        latencyMs: Date.now() - startMs,
        provider: this.name,
      };
    } catch (err) {
      return {
        ok: false,
        latencyMs: Date.now() - startMs,
        provider: this.name,
        error: err.message,
      };
    } finally {
      if (worker) {
        try {
          await worker.terminate();
        } catch {
          // ignore
        }
      }
    }
  }
}
