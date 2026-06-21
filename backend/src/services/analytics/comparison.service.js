import Transaction from "../../models/Transaction.js";
import {
  matchUserAndRange,
  withTimeout,
} from "../../utils/aggregationUtils.js";
import {
  getYearOverYearRanges,
  getMonthComparisonRanges,
} from "../../utils/dateRangeUtils.js";
import cache from "../../utils/cache.js";

const CACHE_TTL_MS = 10 * 60 * 1000;

// ─── Shared: income/expense/balance totals for a single date range ────────

export const sumIncomeExpense = async (userId, startDate, endDate) => {
  const result = await Transaction.aggregate(
    [
      matchUserAndRange(userId, startDate, endDate),
      {
        $group: {
          _id: "$type",
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ],
    withTimeout(),
  );

  let income = 0;
  let expense = 0;
  let incomeCount = 0;
  let expenseCount = 0;
  result.forEach((r) => {
    if (r._id === "income") {
      income = r.total;
      incomeCount = r.count;
    }
    if (r._id === "expense") {
      expense = r.total;
      expenseCount = r.count;
    }
  });

  return {
    income: Math.round(income * 100) / 100,
    expense: Math.round(expense * 100) / 100,
    balance: Math.round((income - expense) * 100) / 100,
    transactionCount: incomeCount + expenseCount,
  };
};

// ─── Delta helper — percentage + absolute, divide-by-zero safe ────────────

export const computeDelta = (currentValue, priorValue) => {
  const absolute = Math.round((currentValue - priorValue) * 100) / 100;
  const percentage =
    priorValue === 0
      ? currentValue === 0
        ? 0
        : null // undefined % change when prior was zero and current isn't
      : Math.round((absolute / Math.abs(priorValue)) * 10000) / 100;

  return { absolute, percentage };
};

// ─── Year-over-year ─────────────────────────────────────────────────────────

export const getYearOverYearService = async (userId, year) => {
  const key = cache.buildKey(userId, "yoy", { year });

  return cache.wrap(
    key,
    async () => {
      const { current, prior } = getYearOverYearRanges(year);

      const [currentTotals, priorTotals] = await Promise.all([
        sumIncomeExpense(userId, current.startDate, current.endDate),
        sumIncomeExpense(userId, prior.startDate, prior.endDate),
      ]);

      return {
        current: { ...current, ...currentTotals },
        prior: { ...prior, ...priorTotals },
        delta: {
          income: computeDelta(currentTotals.income, priorTotals.income),
          expense: computeDelta(currentTotals.expense, priorTotals.expense),
          balance: computeDelta(currentTotals.balance, priorTotals.balance),
        },
      };
    },
    { ttlMs: CACHE_TTL_MS },
  );
};

// ─── Monthly comparison (defaults to this month vs last month) ────────────

export const getMonthComparisonService = async (userId, params = {}) => {
  const key = cache.buildKey(userId, "monthComparison", params);

  return cache.wrap(
    key,
    async () => {
      const { current, prior } = getMonthComparisonRanges(params);

      const [currentTotals, priorTotals] = await Promise.all([
        sumIncomeExpense(userId, current.startDate, current.endDate),
        sumIncomeExpense(userId, prior.startDate, prior.endDate),
      ]);

      return {
        current: { ...current, ...currentTotals },
        prior: { ...prior, ...priorTotals },
        delta: {
          income: computeDelta(currentTotals.income, priorTotals.income),
          expense: computeDelta(currentTotals.expense, priorTotals.expense),
          balance: computeDelta(currentTotals.balance, priorTotals.balance),
        },
      };
    },
    { ttlMs: CACHE_TTL_MS },
  );
};
