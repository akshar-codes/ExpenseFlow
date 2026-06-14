import { useEffect, useState, useCallback } from "react";
import { TransactionContext } from "./TransactionContext";
import {
  getTransactions,
  createTransaction,
  deleteTransaction,
  updateTransaction,
} from "../api/transactionApi";
import { DEFAULT_FILTERS } from "../constants/transactionFilters";
import { normalizeTransaction } from "../utils/transactionUtils";

// ─── Provider ─────────────────────────────────────────────────────────────────

export const TransactionProvider = ({ children }) => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    pages: 1,
    limit: 10,
  });
  const [filters, setFiltersState] = useState(DEFAULT_FILTERS);

  const fetchTransactions = useCallback(
    async (signal) => {
      try {
        setLoading(true);
        setError(null);

        const data = await getTransactions(filters, { signal });

        const raw = data.transactions || [];
        setTransactions(raw.map(normalizeTransaction));
        setPagination(
          data.pagination ?? { total: 0, page: 1, pages: 1, limit: 10 },
        );
      } catch (err) {
        if (
          err?.name === "AbortError" ||
          err?.name === "CanceledError" ||
          err?.code === "ERR_CANCELED"
        ) {
          return;
        }
        setError(
          err?.response?.data?.message || "Failed to load transactions.",
        );
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [filters],
  );

  useEffect(() => {
    const controller = new AbortController();
    queueMicrotask(() => fetchTransactions(controller.signal));
    return () => {
      controller.abort();
    };
  }, [fetchTransactions]);

  // ── setFilters ─────────────────────────────────────────────────────────────
  const setFilters = useCallback((updater) => {
    setFiltersState((prev) => {
      const next =
        typeof updater === "function" ? updater(prev) : { ...prev, ...updater };
      const changedKeys = Object.keys(next).filter((k) => next[k] !== prev[k]);
      const onlyPageChanged =
        changedKeys.length === 1 && changedKeys[0] === "page";
      return onlyPageChanged ? next : { ...next, page: 1 };
    });
  }, []);

  const setPage = useCallback((page) => {
    setFiltersState((prev) => ({ ...prev, page }));
  }, []);

  const resetFilters = useCallback(() => {
    setFiltersState(DEFAULT_FILTERS);
  }, []);

  // ── ADD ───────────────────────────────────────────────────────────────────
  const addTransaction = useCallback(
    async (tx) => {
      const res = await createTransaction(tx);
      const newTx = res.transaction || res;

      const controller = new AbortController();
      await fetchTransactions(controller.signal);

      return {
        transaction: normalizeTransaction(newTx),
        budgetWarning: res.budgetWarning ?? false,
        warningMessage: res.warningMessage ?? "",
      };
    },
    [fetchTransactions],
  );

  // ── DELETE ────────────────────────────────────────────────────────────────
  const removeTransaction = useCallback(
    async (id) => {
      await deleteTransaction(id);
      setTransactions((prev) => prev.filter((t) => t._id !== id));
      const controller = new AbortController();
      await fetchTransactions(controller.signal);
    },
    [fetchTransactions],
  );

  // ── EDIT ──────────────────────────────────────────────────────────────────
  const editTransaction = useCallback(
    async (id, updatedData) => {
      const res = await updateTransaction(id, updatedData);
      const updated = res.transaction || res;
      const normalized = normalizeTransaction(updated);

      setTransactions((prev) =>
        prev.map((t) => (t._id === id ? normalized : t)),
      );

      const controller = new AbortController();
      await fetchTransactions(controller.signal);

      return normalized;
    },
    [fetchTransactions],
  );

  // ── Manual refresh ────────────────────────────────────────────────────────
  const refreshTransactions = useCallback(() => {
    const controller = new AbortController();
    fetchTransactions(controller.signal);
  }, [fetchTransactions]);

  return (
    <TransactionContext.Provider
      value={{
        transactions,
        loading,
        error,
        pagination,
        filters,
        setFilters,
        setPage,
        resetFilters,
        addTransaction,
        removeTransaction,
        editTransaction,
        fetchTransactions: refreshTransactions,
      }}
    >
      {children}
    </TransactionContext.Provider>
  );
};
