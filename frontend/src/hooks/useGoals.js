import { useState, useCallback, useRef } from "react";
import { useAuth } from "./useAuth"; // existing context

const BASE_URL = "/api/goals";

/**
 * Centralized Goals API hook.
 * Follows the same pattern as useTransactions / useBudgets.
 */
export function useGoals() {
  const { token } = useAuth();

  const [goals, setGoals] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const abortRef = useRef(null);

  function authHeaders() {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
  }

  // ── Fetch list ──────────────────────────────────────────────────────────────

  const fetchGoals = useCallback(
    async (params = {}) => {
      if (abortRef.current) abortRef.current.abort();
      abortRef.current = new AbortController();

      setLoading(true);
      setError(null);

      const query = new URLSearchParams(
        Object.fromEntries(
          Object.entries(params).filter(([, v]) => v !== undefined && v !== ""),
        ),
      ).toString();

      try {
        const res = await fetch(`${BASE_URL}${query ? `?${query}` : ""}`, {
          headers: authHeaders(),
          signal: abortRef.current.signal,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to fetch goals");

        setGoals(data.data);
        setPagination(data.pagination);
        return data;
      } catch (err) {
        if (err.name === "AbortError") return;
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [token],
  );

  // ── Create ──────────────────────────────────────────────────────────────────

  const createGoal = useCallback(
    async (payload) => {
      setError(null);
      const res = await fetch(BASE_URL, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data.details
          ? data.details.map((d) => d.message).join(", ")
          : data.error;
        throw new Error(msg || "Failed to create goal");
      }
      setGoals((prev) => [data.data, ...prev]);
      return data.data;
    },
    [token],
  );

  // ── Update ──────────────────────────────────────────────────────────────────

  const updateGoal = useCallback(
    async (id, payload) => {
      setError(null);
      const res = await fetch(`${BASE_URL}/${id}`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data.details
          ? data.details.map((d) => d.message).join(", ")
          : data.error;
        throw new Error(msg || "Failed to update goal");
      }
      setGoals((prev) => prev.map((g) => (g._id === id ? data.data : g)));
      return data.data;
    },
    [token],
  );

  // ── Delete ──────────────────────────────────────────────────────────────────

  const deleteGoal = useCallback(
    async (id) => {
      setError(null);
      const res = await fetch(`${BASE_URL}/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete goal");

      setGoals((prev) => prev.filter((g) => g._id !== id));
      return data;
    },
    [token],
  );

  // ── Single goal ─────────────────────────────────────────────────────────────

  const fetchGoalById = useCallback(
    async (id) => {
      const res = await fetch(`${BASE_URL}/${id}`, {
        headers: authHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Goal not found");
      return data.data;
    },
    [token],
  );

  // ── Statistics ──────────────────────────────────────────────────────────────

  const fetchStatistics = useCallback(async () => {
    const res = await fetch(`${BASE_URL}/statistics`, {
      headers: authHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to fetch statistics");
    return data.data;
  }, [token]);

  // ── Dashboard ───────────────────────────────────────────────────────────────

  const fetchDashboard = useCallback(async () => {
    const res = await fetch(`${BASE_URL}/dashboard`, {
      headers: authHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to fetch dashboard");
    return data.data;
  }, [token]);

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
