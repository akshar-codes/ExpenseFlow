import { useState, useEffect, useCallback } from "react";
import {
  getRecentContributions,
  getMonthlySavings,
} from "../api/contributionApi";

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const buildChartData = (raw = []) => {
  const buckets = MONTH_LABELS.map((label) => ({ month: label, total: 0 }));
  raw.forEach(({ month, total }) => {
    const idx = month - 1;
    if (idx >= 0 && idx <= 11) buckets[idx].total = total;
  });
  return buckets;
};

/**
 * Dashboard-level savings data: recent contributions feed + monthly chart.
 * Follows the same shape as useDashboardAnalytics.js (load/refresh/error).
 */
const useSavingsDashboard = (year = new Date().getFullYear()) => {
  const [recentContributions, setRecentContributions] = useState([]);
  const [monthlyChart, setMonthlyChart] = useState(() => buildChartData());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(
    async (signal) => {
      setLoading(true);
      setError(null);
      try {
        const [recentRes, monthlyRes] = await Promise.all([
          getRecentContributions(5),
          getMonthlySavings(year),
        ]);

        if (signal?.aborted) return;

        setRecentContributions(recentRes.data ?? []);
        setMonthlyChart(buildChartData(monthlyRes.data ?? []));
      } catch (err) {
        if (err?.name === "CanceledError" || err?.name === "AbortError") return;
        setError(
          err?.response?.data?.message ||
            err?.message ||
            "Failed to load savings data.",
        );
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [year],
  );

  useEffect(() => {
    const controller = new AbortController();
    queueMicrotask(() => load(controller.signal));
    return () => controller.abort();
  }, [load]);

  const refresh = useCallback(() => {
    const controller = new AbortController();
    load(controller.signal);
  }, [load]);

  return {
    recentContributions,
    monthlyChart,
    loading,
    error,
    refresh,
  };
};

export default useSavingsDashboard;
