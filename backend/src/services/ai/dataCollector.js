import mongoose from "mongoose";
import Transaction from "../../models/Transaction.js";
import Budget from "../../models/Budget.js";
import Category from "../../models/Category.js";
import { Goal } from "../../models/Goal.js";
import {
  getMonthDateRange,
  getYearDateRange,
  utcMonthYear,
} from "../../utils/dateUtils.js";

const QUERY_TIMEOUT_MS = 10_000;
const to$ = (v) => Math.round((v ?? 0) * 100) / 100;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const uid = (userId) => new mongoose.Types.ObjectId(userId);

async function monthlyTotals(userId, month, year) {
  const { startDate, endDate } = getMonthDateRange(month, year);
  const raw = await Transaction.aggregate(
    [
      {
        $match: { user: uid(userId), date: { $gte: startDate, $lte: endDate } },
      },
      {
        $group: {
          _id: "$type",
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ],
    { maxTimeMS: QUERY_TIMEOUT_MS },
  );
  let income = 0,
    expense = 0,
    incomeCount = 0,
    expenseCount = 0;
  raw.forEach((r) => {
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
    income: to$(income),
    expense: to$(expense),
    balance: to$(income - expense),
    transactionCount: incomeCount + expenseCount,
  };
}

async function categorySpend(userId, month, year, type = "expense") {
  const { startDate, endDate } = getMonthDateRange(month, year);
  return Transaction.aggregate(
    [
      {
        $match: {
          user: uid(userId),
          type,
          date: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "cat",
        },
      },
      { $unwind: { path: "$cat", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: "$category",
          name: { $first: { $ifNull: ["$cat.name", "Unknown"] } },
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          category: "$name",
          total: { $round: ["$total", 2] },
          count: 1,
        },
      },
      { $sort: { total: -1 } },
    ],
    { maxTimeMS: QUERY_TIMEOUT_MS },
  );
}

async function rollingMonthlyTotals(userId, months = 6) {
  const now = new Date();
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1), 1),
  );
  const end = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999),
  );

  const raw = await Transaction.aggregate(
    [
      { $match: { user: uid(userId), date: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: {
            month: { $month: { date: "$date", timezone: "UTC" } },
            year: { $year: { date: "$date", timezone: "UTC" } },
            type: "$type",
          },
          total: { $sum: "$amount" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ],
    { maxTimeMS: QUERY_TIMEOUT_MS },
  );

  const map = new Map();
  raw.forEach((r) => {
    const key = `${r._id.year}-${r._id.month}`;
    if (!map.has(key))
      map.set(key, {
        month: r._id.month,
        year: r._id.year,
        income: 0,
        expense: 0,
      });
    map.get(key)[r._id.type] = to$(r.total);
  });
  return [...map.values()].map((b) => ({
    ...b,
    net: to$(b.income - b.expense),
  }));
}

async function budgetStatus(userId, month, year) {
  const { startDate, endDate } = getMonthDateRange(month, year);
  const budgets = await Budget.aggregate(
    [
      { $match: { user: uid(userId), month, year } },
      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "cat",
        },
      },
      { $unwind: { path: "$cat", preserveNullAndEmptyArrays: false } },
      {
        $project: { category: "$cat._id", categoryName: "$cat.name", limit: 1 },
      },
    ],
    { maxTimeMS: QUERY_TIMEOUT_MS },
  );

  if (!budgets.length) return [];

  const categoryIds = budgets.map((b) => b.category);
  const spendRaw = await Transaction.aggregate(
    [
      {
        $match: {
          user: uid(userId),
          type: "expense",
          category: { $in: categoryIds },
          date: { $gte: startDate, $lte: endDate },
        },
      },
      { $group: { _id: "$category", spent: { $sum: "$amount" } } },
    ],
    { maxTimeMS: QUERY_TIMEOUT_MS },
  );

  const spentMap = new Map(spendRaw.map((s) => [String(s._id), to$(s.spent)]));

  return budgets.map((b) => {
    const spent = spentMap.get(String(b.category)) ?? 0;
    const pct = b.limit > 0 ? Math.round((spent / b.limit) * 10000) / 100 : 0;
    return {
      category: b.categoryName,
      limit: b.limit,
      spent,
      remaining: to$(b.limit - spent),
      percentage: pct,
      exceeded: spent > b.limit,
      warning: pct >= 80 && spent <= b.limit,
    };
  });
}

async function largestTransactions(userId, month, year, limit = 5) {
  const { startDate, endDate } = getMonthDateRange(month, year);
  return Transaction.aggregate(
    [
      {
        $match: {
          user: uid(userId),
          type: "expense",
          date: { $gte: startDate, $lte: endDate },
        },
      },
      { $sort: { amount: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "cat",
        },
      },
      { $unwind: { path: "$cat", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          amount: 1,
          note: 1,
          date: 1,
          category: { $ifNull: ["$cat.name", "Unknown"] },
        },
      },
    ],
    { maxTimeMS: QUERY_TIMEOUT_MS },
  );
}

async function activeGoals(userId) {
  const goals = await Goal.find({ user: userId, status: "active" })
    .select("title targetAmount currentAmount targetDate priority")
    .lean();

  return goals.map((g) => ({
    title: g.title,
    targetAmount: g.targetAmount,
    currentAmount: g.currentAmount,
    progressPct:
      g.targetAmount > 0
        ? Math.round((g.currentAmount / g.targetAmount) * 10000) / 100
        : 0,
    targetDate: g.targetDate,
    priority: g.priority,
    daysRemaining: Math.ceil(
      (new Date(g.targetDate) - new Date()) / (1000 * 60 * 60 * 24),
    ),
  }));
}

async function anomalies(userId, month, year, rollingMonths) {
  // Compare current month's category spend to rolling average
  const current = await categorySpend(userId, month, year);
  if (!current.length || !rollingMonths.length) return [];

  // Build per-category average from rolling months (excluding current month)
  const catMap = new Map();
  for (const m of rollingMonths.slice(0, -1)) {
    const spend = await categorySpend(userId, m.month, m.year);
    spend.forEach((s) => {
      if (!catMap.has(s.category)) catMap.set(s.category, []);
      catMap.get(s.category).push(s.total);
    });
  }

  const flagged = [];
  current.forEach((c) => {
    const history = catMap.get(c.category) ?? [];
    if (!history.length) return;
    const avg = history.reduce((a, b) => a + b, 0) / history.length;
    if (avg === 0) return;
    const spike = ((c.total - avg) / avg) * 100;
    if (spike > 40) {
      // >40% above rolling average = anomaly
      flagged.push({
        category: c.category,
        currentSpend: c.total,
        averageSpend: to$(avg),
        spikePercent: Math.round(spike),
      });
    }
  });

  return flagged.sort((a, b) => b.spikePercent - a.spikePercent).slice(0, 5);
}

// ─── Main collector ────────────────────────────────────────────────────────────

export async function collectFinancialData(userId, options = {}) {
  const now = new Date();
  const month = options.month ?? now.getUTCMonth() + 1;
  const year = options.year ?? now.getUTCFullYear();

  // Derive prior month safely
  const priorDate = new Date(Date.UTC(year, month - 2, 1));
  const priorMonth = priorDate.getUTCMonth() + 1;
  const priorYear = priorDate.getUTCFullYear();

  const [
    current,
    prior,
    currentExpenseByCategory,
    currentIncomeByCategory,
    priorExpenseByCategory,
    rolling6,
    budgets,
    largest,
    goals,
  ] = await Promise.all([
    monthlyTotals(userId, month, year),
    monthlyTotals(userId, priorMonth, priorYear),
    categorySpend(userId, month, year, "expense"),
    categorySpend(userId, month, year, "income"),
    categorySpend(userId, priorMonth, priorYear, "expense"),
    rollingMonthlyTotals(userId, 6),
    budgetStatus(userId, month, year),
    largestTransactions(userId, month, year, 5),
    activeGoals(userId),
  ]);

  const spendingAnomalies = await anomalies(userId, month, year, rolling6);

  // Compute 6-month averages
  const avgIncome = rolling6.length
    ? to$(rolling6.reduce((s, m) => s + m.income, 0) / rolling6.length)
    : 0;
  const avgExpense = rolling6.length
    ? to$(rolling6.reduce((s, m) => s + m.expense, 0) / rolling6.length)
    : 0;

  // Month-on-month delta
  const momExpenseDelta =
    prior.expense > 0
      ? Math.round(
          ((current.expense - prior.expense) / prior.expense) * 10000,
        ) / 100
      : null;
  const momIncomeDelta =
    prior.income > 0
      ? Math.round(((current.income - prior.income) / prior.income) * 10000) /
        100
      : null;

  const savingsRate =
    current.income > 0
      ? Math.round((current.balance / current.income) * 10000) / 100
      : 0;

  return {
    period: { month, year, priorMonth, priorYear },
    current,
    prior,
    deltas: { expenseMoM: momExpenseDelta, incomeMoM: momIncomeDelta },
    averages: { income: avgIncome, expense: avgExpense },
    savingsRate,
    expenseByCategory: currentExpenseByCategory.slice(0, 10),
    incomeByCategory: currentIncomeByCategory.slice(0, 5),
    priorExpenseByCategory: priorExpenseByCategory.slice(0, 10),
    budgets,
    largestExpenses: largest,
    activeGoals: goals,
    spendingAnomalies,
    rolling6Months: rolling6,
  };
}
