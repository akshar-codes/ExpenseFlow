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
import {
  enqueueTransaction,
  getPendingTransactions,
} from "../utils/pwa/indexedDbQueue";
import {
  requestTransactionSync,
  isServiceWorkerSupported,
} from "../utils/pwa/serviceWorkerRegistration";
import {
  SYNC_COMPLETE_EVENT,
  notifyQueueChanged,
} from "../utils/pwa/pwaEvents";
import useCategories from "../hooks/useCategories";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// A network-layer failure (no response at all) means the request never
// reached the server — this is the signal we treat as "offline", as
// opposed to a validation/auth error which DOES have a response and must
// surface normally instead of being silently queued.
const isNetworkFailure = (err) =>
  !err?.response &&
  (err?.code === "ERR_NETWORK" ||
    err?.message === "Network Error" ||
    !navigator.onLine);

// Resolves the category name locally (from the already-loaded CategoryContext)
// so the optimistic row displays a real name instead of a raw ObjectId while
// the transaction is still queued for background sync.
const toOptimisticTransaction = (payload, localId, categories) => {
  const matchedCategory = categories.find((c) => c._id === payload.category);
  return {
    _id: `pending-${localId}`,
    ...payload,
    category: matchedCategory
      ? {
          _id: matchedCategory._id,
          name: matchedCategory.name,
          type: matchedCategory.type,
        }
      : payload.category,
    isPendingSync: true,
    createdAt: new Date().toISOString(),
  };
};

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
  const { categories } = useCategories();

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
        // Offline with a cached API response served by the service worker
        // (see public/sw.js networkFirstApi) — don't show an error banner
        // for stale-but-present data.
        if (isNetworkFailure(err)) {
          setError(null);
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

  // Refresh the list whenever the service worker reports queued
  // transactions were successfully synced in the background.
  useEffect(() => {
    const handleSyncComplete = () => {
      const controller = new AbortController();
      fetchTransactions(controller.signal);
    };
    window.addEventListener(SYNC_COMPLETE_EVENT, handleSyncComplete);
    return () =>
      window.removeEventListener(SYNC_COMPLETE_EVENT, handleSyncComplete);
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

  // ── ADD (with offline queueing) ──────────────────────────────────────────
  const addTransaction = useCallback(
    async (tx) => {
      // Fast path: known-offline. Skip the network round trip entirely.
      if (!navigator.onLine) {
        const queued = await enqueueTransaction(tx, API_BASE);
        notifyQueueChanged();
        if (isServiceWorkerSupported()) await requestTransactionSync();

        const optimistic = normalizeTransaction(
          toOptimisticTransaction(tx, queued.localId, categories),
        );
        setTransactions((prev) => [optimistic, ...prev]);

        return {
          transaction: optimistic,
          queuedOffline: true,
          budgetWarning: false,
          warningMessage: "",
        };
      }

      try {
        const res = await createTransaction(tx);
        const newTx = res.transaction || res;

        const controller = new AbortController();
        await fetchTransactions(controller.signal);

        return {
          transaction: normalizeTransaction(newTx),
          queuedOffline: false,
          budgetWarning: res.budgetWarning ?? false,
          warningMessage: res.warningMessage ?? "",
        };
      } catch (err) {
        if (!isNetworkFailure(err)) throw err;

        // The request left the tab but never reached the server (dropped
        // connection mid-flight) — fall back to the same offline queue path.
        const queued = await enqueueTransaction(tx, API_BASE);
        notifyQueueChanged();
        if (isServiceWorkerSupported()) await requestTransactionSync();

        const optimistic = normalizeTransaction(
          toOptimisticTransaction(tx, queued.localId, categories),
        );
        setTransactions((prev) => [optimistic, ...prev]);

        return {
          transaction: optimistic,
          queuedOffline: true,
          budgetWarning: false,
          warningMessage: "",
        };
      }
    },
    [fetchTransactions, categories],
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

  const getPendingOfflineTransactions = useCallback(
    () => getPendingTransactions(),
    [],
  );

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
        getPendingOfflineTransactions,
      }}
    >
      {children}
    </TransactionContext.Provider>
  );
};
