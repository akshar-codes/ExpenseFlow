import mongoose from "mongoose";
import Transaction from "../../models/Transaction.js";
import User from "../../models/User.js";
import { getBudgetStatusService } from "../budget.service.js";
import { getDashboardData } from "../goal.service.js";
import { generateInsights } from "../ai/insights.service.js";
import { getMonthDateRange, utcMonthYear } from "../../utils/dateUtils.js";
import { ServiceError } from "../../utils/ServiceError.js";
import logger from "../../config/logger.js";

const MONTH_LABELS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const uid = (userId) => new mongoose.Types.ObjectId(userId);
const round2 = (n) => Math.round((n ?? 0) * 100) / 100;

// ─── Shared aggregations (identical logic for monthly and custom ranges) ────

async function totalsForRange(userId, startDate, endDate) {
  const raw = await Transaction.aggregate([
    { $match: { user: uid(userId), date: { $gte: startDate, $lte: endDate } } },
    {
      $group: { _id: "$type", total: { $sum: "$amount" }, count: { $sum: 1 } },
    },
  ]);

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

  const transactionCount = incomeCount + expenseCount;
  const balance = round2(income - expense);

  return {
    income: round2(income),
    expense: round2(expense),
    balance,
    transactionCount,
    savingsRate: income > 0 ? round2((balance / income) * 100) : 0,
    avgTransaction:
      transactionCount > 0 ? round2((income + expense) / transactionCount) : 0,
  };
}

async function categoryBreakdownForRange(userId, startDate, endDate, type) {
  return Transaction.aggregate([
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
        category: { $first: { $ifNull: ["$cat.name", "Unknown"] } },
        total: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
    {
      $project: {
        _id: 0,
        category: 1,
        total: { $round: ["$total", 2] },
        count: 1,
      },
    },
    { $sort: { total: -1 } },
  ]);
}

async function monthlyTrendForRange(userId, startDate, endDate) {
  const raw = await Transaction.aggregate([
    { $match: { user: uid(userId), date: { $gte: startDate, $lte: endDate } } },
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
  ]);

  const map = new Map();
  raw.forEach((r) => {
    const key = `${r._id.year}-${r._id.month}`;
    if (!map.has(key)) {
      map.set(key, {
        month: r._id.month,
        year: r._id.year,
        income: 0,
        expense: 0,
      });
    }
    map.get(key)[r._id.type] = round2(r.total);
  });

  return [...map.values()]
    .sort((a, b) => a.year - b.year || a.month - b.month)
    .map((m) => ({
      ...m,
      label: `${MONTH_LABELS[m.month - 1].slice(0, 3)} '${String(m.year).slice(2)}`,
    }));
}

// ─── Deterministic (non-AI) financial health heuristic ─────────────────────

function calculateHeuristicHealth({ savingsRate, budgets, goals }) {
  let score = 50;
  score += Math.max(-20, Math.min(30, savingsRate * 0.8));

  const overBudgetCount = budgets.filter((b) => b.exceeded).length;
  score -= overBudgetCount * 8;

  const avgGoalProgress = goals.length
    ? goals.reduce((s, g) => s + (g.progressPercentage || 0), 0) / goals.length
    : null;
  if (avgGoalProgress != null) score += Math.min(15, avgGoalProgress * 0.15);

  score = Math.max(0, Math.min(100, Math.round(score)));

  const grade =
    score >= 80
      ? "A"
      : score >= 65
        ? "B"
        : score >= 50
          ? "C"
          : score >= 35
            ? "D"
            : "F";

  const summary =
    savingsRate >= 20
      ? "Savings rate is healthy and budgets are largely under control."
      : savingsRate > 0
        ? "Positive savings rate, but there is room to tighten discretionary spending."
        : "Expenses matched or exceeded income for this period — review discretionary categories.";

  return { score, grade, summary, source: "Calculated (heuristic)" };
}

// ─── Monthly report ──────────────────────────────────────────────────────────

export async function collectMonthlyReportData(userId, month, year) {
  const { startDate, endDate } = getMonthDateRange(month, year);
  const user = await User.findById(userId).select("name email");
  if (!user) throw new ServiceError("User not found", 404);

  // Trailing 6-month window (inclusive of the report month) for the trend chart.
  const rollingStart = new Date(Date.UTC(year, month - 1 - 5, 1));

  const [
    summary,
    expenseByCategory,
    incomeByCategory,
    monthlyTrend,
    budgets,
    goalDashboard,
  ] = await Promise.all([
    totalsForRange(userId, startDate, endDate),
    categoryBreakdownForRange(userId, startDate, endDate, "expense"),
    categoryBreakdownForRange(userId, startDate, endDate, "income"),
    monthlyTrendForRange(userId, rollingStart, endDate),
    getBudgetStatusService(userId, { month, year }),
    getDashboardData(userId),
  ]);

  let aiSummary = {
    aiAvailable: false,
    headline: null,
    narrative: null,
    insights: [],
    recommendations: [],
  };
  let healthScore;

  try {
    const ai = await generateInsights(userId, { month, year });
    aiSummary = {
      aiAvailable: ai.aiAvailable,
      headline: ai.monthlySummary?.headline,
      narrative: ai.monthlySummary?.narrative,
      insights: ai.insights,
      recommendations: ai.recommendations,
    };
    healthScore =
      ai.aiAvailable && ai.healthScore?.score != null
        ? { ...ai.healthScore, source: "AI-generated" }
        : calculateHeuristicHealth({
            savingsRate: summary.savingsRate,
            budgets,
            goals: goalDashboard.activeGoals,
          });
  } catch (err) {
    logger.warn(
      { err: err.message, userId: String(userId) },
      "reportDataCollector: AI insights unavailable, using heuristic health score",
    );
    healthScore = calculateHeuristicHealth({
      savingsRate: summary.savingsRate,
      budgets,
      goals: goalDashboard.activeGoals,
    });
  }

  return {
    user: { name: user.name, email: user.email },
    type: "monthly",
    period: { label: `${MONTH_LABELS[month - 1]} ${year}`, startDate, endDate },
    summary,
    expenseByCategory,
    incomeByCategory,
    monthlyTrend,
    budgets,
    budgetsUnavailableReason: null,
    goals: goalDashboard.activeGoals,
    healthScore,
    aiSummary,
  };
}

// ─── Custom date-range report ────────────────────────────────────────────────

export async function collectCustomReportData(userId, startDate, endDate) {
  const user = await User.findById(userId).select("name email");
  if (!user) throw new ServiceError("User not found", 404);

  const [
    summary,
    expenseByCategory,
    incomeByCategory,
    monthlyTrend,
    goalDashboard,
  ] = await Promise.all([
    totalsForRange(userId, startDate, endDate),
    categoryBreakdownForRange(userId, startDate, endDate, "expense"),
    categoryBreakdownForRange(userId, startDate, endDate, "income"),
    monthlyTrendForRange(userId, startDate, endDate),
    getDashboardData(userId),
  ]);

  // Budgets are tracked per calendar month (Budget.month/year). A custom range

  const { month: sMonth, year: sYear } = utcMonthYear(startDate);
  const { month: eMonth, year: eYear } = utcMonthYear(endDate);
  const sameMonth = sMonth === eMonth && sYear === eYear;

  let budgets = [];
  let budgetsUnavailableReason = null;
  if (sameMonth) {
    budgets = await getBudgetStatusService(userId, {
      month: sMonth,
      year: sYear,
    });
  } else {
    budgetsUnavailableReason =
      "Budget analysis is only available for date ranges within a single calendar month. " +
      "Generate a monthly report, or select a narrower custom range, to see budget utilization.";
  }

  const healthScore = calculateHeuristicHealth({
    savingsRate: summary.savingsRate,
    budgets,
    goals: goalDashboard.activeGoals,
  });

  const fmt = (d) =>
    d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });

  return {
    user: { name: user.name, email: user.email },
    type: "custom",
    period: {
      label: `${fmt(startDate)} – ${fmt(endDate)}`,
      startDate,
      endDate,
    },
    summary,
    expenseByCategory,
    incomeByCategory,
    monthlyTrend,
    budgets,
    budgetsUnavailableReason,
    goals: goalDashboard.activeGoals,
    healthScore,
    aiSummary: {
      aiAvailable: false,
      headline: null,
      narrative:
        "AI-generated narratives are currently only available for monthly reports. This section reflects " +
        "a calculated summary of the selected period.",
      insights: [],
      recommendations: [],
    },
  };
}
