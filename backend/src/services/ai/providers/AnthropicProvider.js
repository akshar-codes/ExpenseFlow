import { AIProvider } from "../AIProvider.js";
import logger from "../../../config/logger.js";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_MODEL = "claude-haiku-4-5-20251001";
const DEFAULT_MAX_TOKENS = 2048;
const REQUEST_TIMEOUT_MS = 30_000;

export class AnthropicProvider extends AIProvider {
  constructor(config = {}) {
    super(config);
    this._apiKey = config.apiKey || process.env.ANTHROPIC_API_KEY;
    this._model = config.model || process.env.AI_MODEL || DEFAULT_MODEL;

    if (!this._apiKey) {
      throw new Error(
        "AnthropicProvider: ANTHROPIC_API_KEY is not set. " +
          "Add it to your .env file or pass it via config.apiKey.",
      );
    }
  }

  get name() {
    return "anthropic";
  }

  /**
   * Call the Anthropic Messages API and return a normalized AIInsightResponse.
   */
  async generateInsights(systemPrompt, userPrompt, options = {}) {
    const startMs = Date.now();

    const body = {
      model: this._model,
      max_tokens: options.maxTokens ?? DEFAULT_MAX_TOKENS,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let response;
    try {
      response = await fetch(ANTHROPIC_API_URL, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this._apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify(body),
      });
    } catch (fetchErr) {
      clearTimeout(timeout);
      if (fetchErr.name === "AbortError") {
        throw new Error(
          `AnthropicProvider: request timed out after ${REQUEST_TIMEOUT_MS}ms`,
        );
      }
      throw fetchErr;
    } finally {
      clearTimeout(timeout);
    }

    const latencyMs = Date.now() - startMs;

    if (!response.ok) {
      const errText = await response.text().catch(() => "(unreadable)");
      logger.error(
        { status: response.status, body: errText },
        "AnthropicProvider: API error",
      );
      throw new Error(
        `AnthropicProvider: API returned ${response.status} — ${errText}`,
      );
    }

    const data = await response.json();

    const rawText = (data.content ?? [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("");

    const parsed = this._parseJSON(rawText);

    logger.info(
      {
        model: this._model,
        inputTokens: data.usage?.input_tokens,
        outputTokens: data.usage?.output_tokens,
        latencyMs,
      },
      "AnthropicProvider: insight generated",
    );

    return {
      success: true,
      rawText,
      parsed,
      meta: {
        provider: this.name,
        model: this._model,
        inputTokens: data.usage?.input_tokens ?? null,
        outputTokens: data.usage?.output_tokens ?? null,
        latencyMs,
      },
    };
  }

  /**
   * Simple connectivity check using a minimal token request.
   */
  async healthCheck() {
    const startMs = Date.now();
    try {
      const resp = await fetch(ANTHROPIC_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this._apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: this._model,
          max_tokens: 10,
          messages: [{ role: "user", content: "ping" }],
        }),
        signal: AbortSignal.timeout(5000),
      });
      return {
        ok: resp.ok,
        latencyMs: Date.now() - startMs,
        provider: this.name,
      };
    } catch {
      return {
        ok: false,
        latencyMs: Date.now() - startMs,
        provider: this.name,
      };
    }
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  _parseJSON(text) {
    // Try fenced JSON first
    const fenced = text.match(/```json\s*([\s\S]*?)```/i);
    const candidate = fenced ? fenced[1].trim() : text.trim();

    try {
      return JSON.parse(candidate);
    } catch {
      // Return the raw text in a wrapper so callers always get an object
      return { _rawFallback: true, text: candidate };
    }
  }
}
