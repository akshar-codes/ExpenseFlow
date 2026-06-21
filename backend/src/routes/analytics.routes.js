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

export default router;
