/**
 * AIProviderFactory
 *
 * Reads AI_PROVIDER from the environment and returns the correct provider
 * instance.  All provider construction happens here — services and
 * controllers import ONLY this factory.
 *
 * Supported providers:
 *   anthropic  (default) — requires ANTHROPIC_API_KEY
 *   openai               — requires OPENAI_API_KEY
 *
 * Usage:
 *   import { getAIProvider } from "./AIProviderFactory.js";
 *   const provider = getAIProvider();          // singleton per process
 *   const result   = await provider.generateInsights(system, user);
 */

import { AnthropicProvider } from "./providers/AnthropicProvider.js";
import { OpenAIProvider } from "./providers/OpenAIProvider.js";
import logger from "../../config/logger.js";

// ── Registry ──────────────────────────────────────────────────────────────────

const PROVIDERS = {
  anthropic: (cfg) => new AnthropicProvider(cfg),
  openai: (cfg) => new OpenAIProvider(cfg),
};

// ── Singleton cache ────────────────────────────────────────────────────────────

let _instance = null;

export const getAIProvider = (config = {}) => {
  if (_instance) return _instance;

  const providerKey = (
    config.provider ||
    process.env.AI_PROVIDER ||
    "anthropic"
  ).toLowerCase();

  const factory = PROVIDERS[providerKey];

  if (!factory) {
    const supported = Object.keys(PROVIDERS).join(", ");
    throw new Error(
      `AIProviderFactory: unknown provider "${providerKey}". ` +
        `Supported: ${supported}. Set AI_PROVIDER in your .env.`,
    );
  }

  logger.info(
    { provider: providerKey },
    "AIProviderFactory: initialising AI provider",
  );

  _instance = factory(config);
  return _instance;
};

/**
 * Reset the singleton.  Call this in tests or after swapping providers at runtime.
 */
export const resetAIProvider = () => {
  _instance = null;
};

/**
 * Convenience: return the name of the active provider without constructing it.
 */
export const getActiveProviderName = () =>
  (process.env.AI_PROVIDER || "anthropic").toLowerCase();
