import { AIProvider } from "../AIProvider.js";
import logger from "../../../config/logger.js";

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const DEFAULT_MODEL = "gpt-4o-mini";
const DEFAULT_MAX_TOKENS = 2048;
const REQUEST_TIMEOUT_MS = 30_000;

export class OpenAIProvider extends AIProvider {
  constructor(config = {}) {
    super(config);
    this._apiKey = config.apiKey || process.env.OPENAI_API_KEY;
    this._model = config.model || process.env.AI_MODEL || DEFAULT_MODEL;

    if (!this._apiKey) {
      throw new Error(
        "OpenAIProvider: OPENAI_API_KEY is not set. " +
          "Add it to your .env file or pass it via config.apiKey.",
      );
    }
  }

  get name() {
    return "openai";
  }

  async generateInsights(systemPrompt, userPrompt, options = {}) {
    const startMs = Date.now();

    const body = {
      model: this._model,
      max_tokens: options.maxTokens ?? DEFAULT_MAX_TOKENS,
      temperature: options.temperature ?? 0.3,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      // Request JSON output directly where supported
      response_format: { type: "json_object" },
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let response;
    try {
      response = await fetch(OPENAI_API_URL, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this._apiKey}`,
        },
        body: JSON.stringify(body),
      });
    } catch (fetchErr) {
      clearTimeout(timeout);
      if (fetchErr.name === "AbortError") {
        throw new Error(
          `OpenAIProvider: request timed out after ${REQUEST_TIMEOUT_MS}ms`,
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
        "OpenAIProvider: API error",
      );
      throw new Error(
        `OpenAIProvider: API returned ${response.status} — ${errText}`,
      );
    }

    const data = await response.json();
    const rawText = data.choices?.[0]?.message?.content ?? "";
    const parsed = this._parseJSON(rawText);

    logger.info(
      {
        model: this._model,
        inputTokens: data.usage?.prompt_tokens,
        outputTokens: data.usage?.completion_tokens,
        latencyMs,
      },
      "OpenAIProvider: insight generated",
    );

    return {
      success: true,
      rawText,
      parsed,
      meta: {
        provider: this.name,
        model: this._model,
        inputTokens: data.usage?.prompt_tokens ?? null,
        outputTokens: data.usage?.completion_tokens ?? null,
        latencyMs,
      },
    };
  }

  async healthCheck() {
    const startMs = Date.now();
    try {
      const resp = await fetch(OPENAI_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this._apiKey}`,
        },
        body: JSON.stringify({
          model: this._model,
          max_tokens: 5,
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

  _parseJSON(text) {
    try {
      return JSON.parse(text.trim());
    } catch {
      const fenced = text.match(/```json\s*([\s\S]*?)```/i);
      if (fenced) {
        try {
          return JSON.parse(fenced[1].trim());
        } catch {
          /* fall through */
        }
      }
      return { _rawFallback: true, text: text.trim() };
    }
  }
}
