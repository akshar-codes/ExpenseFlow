import API from "./axios";

// ─── Overview ─────────────────────────────────────────────────────────────────

export const fetchOverview = async ({ signal } = {}) => {
  const res = await API.get("/analytics/overview", { signal });
  return res.data;
};

// ─── Monthly Summary ──────────────────────────────────────────────────────────

export const fetchMonthlySummary = async (month, year, { signal } = {}) => {
  const res = await API.get("/analytics/monthly", {
    params: { month, year },
    signal,
  });
  return res.data;
};

// ─── Category Breakdown ───────────────────────────────────────────────────────

export const fetchCategoryBreakdown = async (
  type,
  month = null,
  year = null,
  { signal } = {},
) => {
  const params = { type };
  if (year) params.year = year;
  if (month) params.month = month;

  const res = await API.get("/analytics/categories", { params, signal });
  return res.data;
};

export const fetchMonthlyTrend = async (year, { signal } = {}) => {
  const res = await API.get("/analytics/trend", { params: { year }, signal });
  return res.data;
};

// ─── Category Trends ─────────────────────────────────────────────────

export const fetchCategoryTrends = async (
  months,
  type = "expense",
  { signal } = {},
) => {
  const res = await API.get("/analytics/category-trends", {
    params: { months, type },
    signal,
  });
  return res.data;
};

// ─── Top Merchants ────────────────────────────────────────────────────

export const fetchTopMerchants = async (
  days,
  type = "expense",
  limit = 10,
  { signal } = {},
) => {
  const res = await API.get("/analytics/merchants/top", {
    params: { days, type, limit },
    signal,
  });
  return res.data;
};

// ─── Budget Utilization Trend ────────────────────────────────────────

export const fetchBudgetUtilizationTrend = async (months, { signal } = {}) => {
  const res = await API.get("/analytics/budgets/utilization-trend", {
    params: { months },
    signal,
  });
  return res.data;
};

// ───  Largest Expenses ─────────────────────────────────────────────────

export const fetchLargestExpenses = async (
  days,
  type = "expense",
  limit = 10,
  { signal } = {},
) => {
  const res = await API.get("/analytics/expenses/largest", {
    params: { days, type, limit },
    signal,
  });
  return res.data;
};

// ───  Spending Velocity ────────────────────────────────────────────────

export const fetchSpendingVelocity = async (days, { signal } = {}) => {
  const res = await API.get("/analytics/velocity", {
    params: { days },
    signal,
  });
  return res.data;
};

// ─── Income/Expense Trend (savings rate) ─────────────────────────────

export const fetchIncomeExpenseTrend = async (months, { signal } = {}) => {
  const res = await API.get("/analytics/income-expense-trend", {
    params: { months },
    signal,
  });
  return res.data;
};

// ─── Month-End Projection ─────────────────────────────────────────────

export const fetchMonthEndProjection = async ({ signal } = {}) => {
  const res = await API.get("/analytics/month-end-projection", { signal });
  return res.data;
};
