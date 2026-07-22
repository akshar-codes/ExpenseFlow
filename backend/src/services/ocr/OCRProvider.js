/**
 * OCRProvider — abstract base class every OCR engine implementation must
 * extend. This is the seam that allows swapping the OCR engine (local
 * Tesseract today, a cloud provider like Google Vision / AWS Textract
 * tomorrow) without touching any calling code. Mirrors the AIProvider.js
 * pattern used for the AI Insights feature.
 */
export class OCRProvider {
  constructor(config = {}) {
    if (new.target === OCRProvider) {
      throw new TypeError(
        "OCRProvider is abstract — extend it, do not instantiate it directly.",
      );
    }
    this.config = config;
  }

  /**
   * Extract raw text from an image buffer.
   *
   * @param {Buffer} imageBuffer
   * @param {{ lang?: string }} [options]
   * @returns {Promise<{
   *   success: boolean,
   *   text: string,
   *   confidence: number|null,
   *   error?: string,
   *   meta: { provider: string, [key: string]: any },
   * }>}
   */
  // eslint-disable-next-line no-unused-vars
  async extractText(imageBuffer, options = {}) {
    throw new Error(`${this.constructor.name} must implement extractText()`);
  }

  async healthCheck() {
    throw new Error(`${this.constructor.name} must implement healthCheck()`);
  }

  get name() {
    throw new Error(`${this.constructor.name} must expose a name getter`);
  }
}
