import { useState, useEffect, useCallback } from "react";
import {
  getRecurringTransactions,
  addRecurringTransaction,
  updateRecurringTransaction,
  deleteRecurringTransaction,
  toggleRecurringTransaction,
} from "../api/recurringApi";

const useRecurring = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(null);
  const [error, setError] = useState("");

  // ── Initial load ────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const data = await getRecurringTransactions();
        if (!cancelled) setItems(data);
      } catch (err) {
        if (!cancelled) {
          setError(
            err?.response?.data?.message ||
              "Failed to load recurring transactions.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Add ─────────────────────────────────────────────────────────────────
  const addItem = useCallback(async (formData) => {
    setSaving(true);
    setError("");
    try {
      const added = await addRecurringTransaction(formData);
      setItems((prev) => [added, ...prev]);
      return added;
    } catch (err) {
      setError(
        err?.response?.data?.message || "Failed to save. Please try again.",
      );
      throw err;
    } finally {
      setSaving(false);
    }
  }, []);

  // ── Update ──────────────────────────────────────────────────────────────
  const updateItem = useCallback(async (id, formData) => {
    setSaving(true);
    setError("");
    try {
      const updated = await updateRecurringTransaction(id, formData);
      setItems((prev) => prev.map((i) => (i._id === id ? updated : i)));
      return updated;
    } catch (err) {
      setError(
        err?.response?.data?.message || "Failed to save. Please try again.",
      );
      throw err;
    } finally {
      setSaving(false);
    }
  }, []);

  // ── Delete ──────────────────────────────────────────────────────────────
  const deleteItem = useCallback(async (id) => {
    setError("");
    try {
      await deleteRecurringTransaction(id);
      setItems((prev) => prev.filter((i) => i._id !== id));
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to delete.");
      throw err;
    }
  }, []);

  // ── Toggle active/paused (optimistic) ──────────────────────────────────
  const toggleItem = useCallback(async (id, currentIsActive) => {
    const nextIsActive = !currentIsActive;

    setItems((prev) =>
      prev.map((i) => (i._id === id ? { ...i, isActive: nextIsActive } : i)),
    );
    setToggling(id);

    try {
      const serverDoc = await toggleRecurringTransaction(id, nextIsActive);
      setItems((prev) =>
        prev.map((i) =>
          i._id === id
            ? { ...i, isActive: serverDoc.isActive ?? nextIsActive }
            : i,
        ),
      );
    } catch {
      // Revert on failure
      setItems((prev) =>
        prev.map((i) =>
          i._id === id ? { ...i, isActive: currentIsActive } : i,
        ),
      );
      setError("Failed to update status. Please try again.");
    } finally {
      setToggling(null);
    }
  }, []);

  return {
    items,
    loading,
    saving,
    toggling,
    error,
    setError,
    addItem,
    updateItem,
    deleteItem,
    toggleItem,
  };
};

export default useRecurring;
