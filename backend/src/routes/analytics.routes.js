import express from "express";
import {
  getMonthlySummary,
  getCategoryBreakdown,
  getOverview,
  getMonthlyTrend,
  getRolling3Months,
  getRolling6Months,
  getRolling12Months,
  getRollingCustom,
  getYearOverYear,
  getMonthComparison,
  getWeeklyTrends,
  getDailySpending,
  invalidateAnalyticsCache,
  getCategoryTrends,
  getTopMerchants,
  getBudgetUtilizationTrend,
  getLargestExpenses,
  getSpendingVelocity,
  getIncomeExpenseTrend,
  getMonthEndProjection,
} from "../controllers/analytics.controller.js";

import { protect } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  monthlySchema,
  categoriesSchema,
  trendSchema,
  rollingCustomSchema,
  yearOverYearSchema,
  monthComparisonSchema,
  weeklyTrendsSchema,
  dailySpendingSchema,
  categoryTrendsSchema,
  topMerchantsSchema,
  budgetUtilizationSchema,
  largestExpensesSchema,
  spendingVelocitySchema,
  incomeExpenseTrendSchema,
} from "../validators/analytics.validator.js";

const router = express.Router();

// Monthly summary
router.get(
  "/monthly",
  protect,
  validate(monthlySchema, "query"),
  getMonthlySummary,
);

// Category breakdown
router.get(
  "/categories",
  protect,
  validate(categoriesSchema, "query"),
  getCategoryBreakdown,
);

// Overview
router.get("/overview", protect, getOverview);

// Monthly trend
router.get("/trend", protect, validate(trendSchema, "query"), getMonthlyTrend);

// Rolling window presets — fixed sizes, no query params needed
router.get("/rolling/3m", protect, getRolling3Months);
router.get("/rolling/6m", protect, getRolling6Months);
router.get("/rolling/12m", protect, getRolling12Months);

// Rolling window, arbitrary size via ?months=N
router.get(
  "/rolling",
  protect,
  validate(rollingCustomSchema, "query"),
  getRollingCustom,
);

// Year-over-year comparison
router.get(
  "/yoy",
  protect,
  validate(yearOverYearSchema, "query"),
  getYearOverYear,
);

// Month-vs-month comparison (defaults to this month vs last month)
router.get(
  "/compare-months",
  protect,
  validate(monthComparisonSchema, "query"),
  getMonthComparison,
);

// Weekly trends
router.get(
  "/weekly",
  protect,
  validate(weeklyTrendsSchema, "query"),
  getWeeklyTrends,
);

// Daily spending
router.get(
  "/daily",
  protect,
  validate(dailySpendingSchema, "query"),
  getDailySpending,
);

// Manual cache invalidation (debug/support utility)
router.delete("/cache", protect, invalidateAnalyticsCache);

router.get(
  "/category-trends",
  protect,
  validate(categoryTrendsSchema, "query"),
  getCategoryTrends,
);

router.get(
  "/merchants/top",
  protect,
  validate(topMerchantsSchema, "query"),
  getTopMerchants,
);

router.get(
  "/budgets/utilization-trend",
  protect,
  validate(budgetUtilizationSchema, "query"),
  getBudgetUtilizationTrend,
);

router.get(
  "/expenses/largest",
  protect,
  validate(largestExpensesSchema, "query"),
  getLargestExpenses,
);

router.get(
  "/velocity",
  protect,
  validate(spendingVelocitySchema, "query"),
  getSpendingVelocity,
);

router.get(
  "/income-expense-trend",
  protect,
  validate(incomeExpenseTrendSchema, "query"),
  getIncomeExpenseTrend,
);

router.get("/month-end-projection", protect, getMonthEndProjection);

export default router;
