import {
  generateInsights,
  invalidateInsightsCache,
  checkProviderHealth,
} from "../services/ai/insights.service.js";
import { ServiceError } from "../utils/ServiceError.js";

// ── GET /api/ai-insights ──────────────────────────────────────────────────────
// Generate (or return cached) AI insights for the authenticated user.

export const getInsights = async (req, res, next) => {
  try {
    const { month, year, force } = req.validatedQuery ?? req.query;

    const result = await generateInsights(req.user._id, {
      month: month ? Number(month) : undefined,
      year: year ? Number(year) : undefined,
      force: force ?? false,
    });

    res.status(200).json(result);
  } catch (err) {
    if (err instanceof ServiceError) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    next(err);
  }
};

// ── DELETE /api/ai-insights/cache ─────────────────────────────────────────────
// Manually invalidate the user's insight cache (useful after bulk imports).

export const clearInsightsCache = async (req, res, next) => {
  try {
    const removed = invalidateInsightsCache(req.user._id);
    res.status(200).json({ message: "AI insights cache cleared", removed });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/ai-insights/health ───────────────────────────────────────────────
// Check AI provider connectivity without generating full insights.

export const providerHealth = async (req, res, next) => {
  try {
    const result = await checkProviderHealth();
    res.status(result.ok ? 200 : 503).json(result);
  } catch (err) {
    next(err);
  }
};
