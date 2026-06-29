import { useState, useEffect, useCallback } from "react";
import {
  fetchCategoryTrends,
  fetchTopMerchants,
  fetchBudgetUtilizationTrend,
  fetchLargestExpenses,
  fetchSpendingVelocity,
  fetchIncomeExpenseTrend,
  fetchMonthEndProjection,
} from "../api/analyticsApi";

const VELOCITY_DAYS_FIXED = 30;
const TREND_MONTHS_FIXED = 12;

const DEFAULT_WINDOWS = {
  categoryMonths: 6,
  categoryType: "expense",
  merchantDays: 90,
  merchantType: "expense",
  merchantLimit: 10,
  budgetMonths: 6,
  expenseDays: 90,
  expenseType: "expense",
  expenseLimit: 10,
};

const useInsights = (windows = {}) => {
  const w = { ...DEFAULT_WINDOWS, ...windows };

  const [categoryTrends, setCategoryTrends] = useState(null);
  const [topMerchants, setTopMerchants] = useState(null);
  const [budgetUtilization, setBudgetUtilization] = useState(null);
  const [largestExpenses, setLargestExpenses] = useState(null);
  const [velocity, setVelocity] = useState(null);
  const [incomeExpenseTrend, setIncomeExpenseTrend] = useState(null);
  const [monthEndProjection, setMonthEndProjection] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(
    async (signal) => {
      setLoading(true);
      setError(null);

      try {
        const [
          catTrends,
          merchants,
          budgetTrend,
          largest,
          velocityData,
          incomeExpense,
          projection,
        ] = await Promise.all([
          fetchCategoryTrends(w.categoryMonths, w.categoryType, { signal }),
          fetchTopMerchants(w.merchantDays, w.merchantType, w.merchantLimit, {
            signal,
          }),
          fetchBudgetUtilizationTrend(w.budgetMonths, { signal }),
          fetchLargestExpenses(w.expenseDays, w.expenseType, w.expenseLimit, {
            signal,
          }),
          fetchSpendingVelocity(VELOCITY_DAYS_FIXED, { signal }),
          fetchIncomeExpenseTrend(TREND_MONTHS_FIXED, { signal }),
          fetchMonthEndProjection({ signal }),
        ]);

        if (signal?.aborted) return;

        setCategoryTrends(catTrends);
        setTopMerchants(merchants);
        setBudgetUtilization(budgetTrend);
        setLargestExpenses(largest);
        setVelocity(velocityData);
        setIncomeExpenseTrend(incomeExpense);
        setMonthEndProjection(projection);
      } catch (err) {
        if (err?.name === "CanceledError" || err?.name === "AbortError") return;
        setError(
          err?.response?.data?.message ||
            err?.message ||
            "Failed to load insights data.",
        );
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [
      w.categoryMonths,
      w.categoryType,
      w.merchantDays,
      w.merchantType,
      w.merchantLimit,
      w.budgetMonths,
      w.expenseDays,
      w.expenseType,
      w.expenseLimit,
    ],
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
    categoryTrends,
    topMerchants,
    budgetUtilization,
    largestExpenses,
    velocity,
    incomeExpenseTrend,
    monthEndProjection,
    loading,
    error,
    refresh,
  };
};

export default useInsights;
