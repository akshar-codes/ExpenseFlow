// frontend/src/hooks/useGoals.js
import { useState, useCallback, useRef } from "react";
import API from "../api/axios";

/**
 * Centralized Goals API hook.
 * Uses the shared axios instance (auth headers + token refresh handled automatically).
 */
export function useGoals() {
  const [goals, setGoals] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const abortRef = useRef(null);

  // ── Fetch list ──────────────────────────────────────────────────────────────

  const fetchGoals = useCallback(async (params = {}) => {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    setLoading(true);
    setError(null);

    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== ""),
    );

    try {
      const res = await API.get("/goals", {
        params: cleanParams,
        signal: abortRef.current.signal,
      });
      setGoals(res.data.data);
      setPagination(res.data.pagination);
      return res.data;
    } catch (err) {
      if (err?.name === "CanceledError" || err?.name === "AbortError") return;
      const msg =
        err?.response?.data?.error || err?.message || "Failed to fetch goals";
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Create ──────────────────────────────────────────────────────────────────

  const createGoal = useCallback(async (payload) => {
    setError(null);
    const res = await API.post("/goals", payload);
    setGoals((prev) => [res.data.data, ...prev]);
    return res.data.data;
  }, []);

  // ── Update ──────────────────────────────────────────────────────────────────

  const updateGoal = useCallback(async (id, payload) => {
    setError(null);
    const res = await API.put(`/goals/${id}`, payload);
    setGoals((prev) => prev.map((g) => (g._id === id ? res.data.data : g)));
    return res.data.data;
  }, []);

  // ── Delete ──────────────────────────────────────────────────────────────────

  const deleteGoal = useCallback(async (id) => {
    setError(null);
    const res = await API.delete(`/goals/${id}`);
    setGoals((prev) => prev.filter((g) => g._id !== id));
    return res.data;
  }, []);

  // ── Single goal ─────────────────────────────────────────────────────────────

  const fetchGoalById = useCallback(async (id) => {
    const res = await API.get(`/goals/${id}`);
    return res.data.data;
  }, []);

  // ── Statistics ──────────────────────────────────────────────────────────────

  const fetchStatistics = useCallback(async () => {
    const res = await API.get("/goals/statistics");
    return res.data.data;
  }, []);

  // ── Dashboard ───────────────────────────────────────────────────────────────

  const fetchDashboard = useCallback(async () => {
    const res = await API.get("/goals/dashboard");
    return res.data.data;
  }, []);

  return {
    goals,
    pagination,
    loading,
    error,
    fetchGoals,
    createGoal,
    updateGoal,
    deleteGoal,
    fetchGoalById,
    fetchStatistics,
    fetchDashboard,
    clearError: () => setError(null),
  };
}
