import API from "./axios";

/**
 * Fetch AI-generated financial insights for the current user.
 */
export const fetchAIInsights = async (params = {}, { signal } = {}) => {
  const cleanParams = Object.fromEntries(
    Object.entries(params).filter(
      ([, v]) => v !== undefined && v !== null && v !== "",
    ),
  );
  const res = await API.get("/ai-insights", { params: cleanParams, signal });
  return res.data;
};

/**
 * Invalidate the server-side insights cache for the current user.
 * Use after bulk data imports or when stale results are suspected.
 */
export const clearAIInsightsCache = async () => {
  const res = await API.delete("/ai-insights/cache");
  return res.data;
};

/**
 * Check AI provider connectivity.
 * Returns { ok: boolean, latencyMs: number, provider: string }
 */
export const checkAIProviderHealth = async () => {
  const res = await API.get("/ai-insights/health");
  return res.data;
};
