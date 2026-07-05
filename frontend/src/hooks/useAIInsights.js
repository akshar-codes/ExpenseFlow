import { useState, useEffect, useCallback } from "react";
import { fetchAIInsights, clearAIInsightsCache } from "../api/aiInsightsApi";

const useAIInsights = (month, year) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(
    async (signal, opts = {}) => {
      setLoading(true);
      setError(null);

      try {
        const result = await fetchAIInsights(
          { month, year, ...(opts.force ? { force: true } : {}) },
          { signal },
        );

        if (signal?.aborted) return;
        setData(result);
      } catch (err) {
        if (err?.name === "CanceledError" || err?.name === "AbortError") return;
        setError(
          err?.response?.data?.message ||
            err?.message ||
            "Failed to load AI insights.",
        );
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [month, year],
  );

  // Initial load + re-load whenever month/year changes
  useEffect(() => {
    const controller = new AbortController();
    queueMicrotask(() => load(controller.signal));
    return () => controller.abort();
  }, [load]);

  /**
   * Force-refresh: bypasses both the client state and the server-side cache.
   */
  const refresh = useCallback(
    (force = false) => {
      const controller = new AbortController();
      load(controller.signal, { force });
    },
    [load],
  );

  /**
   * Invalidate server cache then trigger a fresh load.
   */
  const invalidateAndRefresh = useCallback(async () => {
    try {
      await clearAIInsightsCache();
    } catch {
      // Cache invalidation failure is non-fatal — proceed with refresh
    }
    refresh(true);
  }, [refresh]);

  return {
    data,
    loading,
    error,
    refresh,
    invalidateAndRefresh,
    // Convenience destructures for common fields
    insights: data?.insights ?? [],
    recommendations: data?.recommendations ?? [],
    healthScore: data?.healthScore ?? null,
    monthlySummary: data?.monthlySummary ?? null,
    monthEndPrediction: data?.monthEndPrediction ?? null,
    snapshot: data?.snapshot ?? null,
    aiAvailable: data?.aiAvailable ?? false,
    fromCache: data?.fromCache ?? false,
    provider: data?.provider ?? null,
    meta: data?.meta ?? null,
  };
};

export default useAIInsights;
