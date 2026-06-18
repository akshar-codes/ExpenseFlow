import { useState, useCallback } from "react";
import {
  addContribution,
  linkTransactionToGoal,
  getContributions,
  undoContribution,
} from "../api/contributionApi";

export function useContributions(goalId) {
  const [contributions, setContributions] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [undoingId, setUndoingId] = useState(null);
  const [error, setError] = useState("");

  // ── Fetch history ───────────────────────────────────────────────────────────
  const fetchHistory = useCallback(
    async (params = {}) => {
      if (!goalId) return;
      setLoading(true);
      setError("");
      try {
        const res = await getContributions(goalId, params);
        setContributions(res.contributions ?? []);
        setPagination(res.pagination ?? null);
        return res;
      } catch (err) {
        setError(
          err?.response?.data?.message ||
            "Failed to load contribution history.",
        );
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [goalId],
  );

  // ── Add manual contribution ────────────────────────────────────────────────
  const addManual = useCallback(
    async (data) => {
      if (!goalId) throw new Error("goalId is required");
      setSaving(true);
      setError("");
      try {
        const res = await addContribution(goalId, data);
        // Prepend the new contribution to local history (optimistic-ish)
        setContributions((prev) => [res.data.contribution, ...prev]);
        return res.data; // { contribution, goal }
      } catch (err) {
        const message =
          err?.response?.data?.message || "Failed to add contribution.";
        setError(message);
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [goalId],
  );

  // ── Link a transaction ─────────────────────────────────────────────────────
  const linkTransaction = useCallback(
    async (data) => {
      if (!goalId) throw new Error("goalId is required");
      setSaving(true);
      setError("");
      try {
        const res = await linkTransactionToGoal(goalId, data);
        setContributions((prev) => [res.data.contribution, ...prev]);
        return res.data;
      } catch (err) {
        const message =
          err?.response?.data?.message || "Failed to link transaction.";
        setError(message);
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [goalId],
  );

  // ── Undo ────────────────────────────────────────────────────────────────────
  const undo = useCallback(
    async (contributionId) => {
      if (!goalId) throw new Error("goalId is required");
      setUndoingId(contributionId);
      setError("");
      try {
        const res = await undoContribution(goalId, contributionId);
        setContributions((prev) =>
          prev.map((c) =>
            c._id === contributionId
              ? { ...c, isUndone: true, undoneAt: new Date().toISOString() }
              : c,
          ),
        );
        return res.data; // { contribution, goal }
      } catch (err) {
        setError(
          err?.response?.data?.message || "Failed to undo contribution.",
        );
        throw err;
      } finally {
        setUndoingId(null);
      }
    },
    [goalId],
  );

  return {
    contributions,
    pagination,
    loading,
    saving,
    undoingId,
    error,
    setError,
    fetchHistory,
    addManual,
    linkTransaction,
    undo,
  };
}

export default useContributions;
