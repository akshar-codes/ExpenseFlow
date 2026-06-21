import {
  getMonthlySummaryService,
  getCategoryBreakdownService,
  getOverviewService,
  getMonthlyTrendService,
  getRolling3MonthsService,
  getRolling6MonthsService,
  getRolling12MonthsService,
  getRollingMonthsService,
  getYearOverYearService,
  getMonthComparisonService,
  getWeeklyTrendsService,
  getDailySpendingService,
} from "../services/analytics/index.js";
import cache from "../utils/cache.js";

// ════════════════════════════════════════════════════════════════════════
// EXISTING HANDLERS — unchanged
// ════════════════════════════════════════════════════════════════════════

// @route   GET /api/analytics/monthly
// @access  Private
export const getMonthlySummary = async (req, res, next) => {
  try {
    const { month, year } = req.query; // already validated + coerced to numbers

    const data = await getMonthlySummaryService(req.user._id, month, year);

    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/analytics/categories
// @access  Private
export const getCategoryBreakdown = async (req, res, next) => {
  try {
    const { type, month, year } = req.query; // already validated + coerced

    const data = await getCategoryBreakdownService(
      req.user._id,
      type,
      month ?? null,
      year ?? null,
    );

    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/analytics/overview
// @access  Private
export const getOverview = async (req, res, next) => {
  try {
    const data = await getOverviewService(req.user._id);
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/analytics/trend
// @access  Private
export const getMonthlyTrend = async (req, res, next) => {
  try {
    const { year } = req.query; // already validated + coerced to number

    const data = await getMonthlyTrendService(req.user._id, year);

    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
};

// ════════════════════════════════════════════════════════════════════════
// NEW HANDLERS — Phase 1
// ════════════════════════════════════════════════════════════════════════

// @route   GET /api/analytics/rolling/3m
// @access  Private
export const getRolling3Months = async (req, res, next) => {
  try {
    const data = await getRolling3MonthsService(req.user._id);
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/analytics/rolling/6m
// @access  Private
export const getRolling6Months = async (req, res, next) => {
  try {
    const data = await getRolling6MonthsService(req.user._id);
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/analytics/rolling/12m
// @access  Private
export const getRolling12Months = async (req, res, next) => {
  try {
    const data = await getRolling12MonthsService(req.user._id);
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/analytics/rolling?months=N
// @access  Private
export const getRollingCustom = async (req, res, next) => {
  try {
    const { months } = req.query;
    const data = await getRollingMonthsService(req.user._id, months);
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/analytics/yoy?year=YYYY
// @access  Private
export const getYearOverYear = async (req, res, next) => {
  try {
    const { year } = req.query;
    const data = await getYearOverYearService(req.user._id, year);
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/analytics/compare-months
// @access  Private
export const getMonthComparison = async (req, res, next) => {
  try {
    const data = await getMonthComparisonService(req.user._id, req.query);
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/analytics/weekly?weeks=N
// @access  Private
export const getWeeklyTrends = async (req, res, next) => {
  try {
    const { weeks } = req.query;
    const data = await getWeeklyTrendsService(req.user._id, weeks);
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/analytics/daily?days=N
// @access  Private
export const getDailySpending = async (req, res, next) => {
  try {
    const { days } = req.query;
    const data = await getDailySpendingService(req.user._id, days);
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
};

// @route   DELETE /api/analytics/cache
// @access  Private
export const invalidateAnalyticsCache = async (req, res, next) => {
  try {
    const removed = cache.invalidateUser(req.user._id);
    res.status(200).json({ message: "Analytics cache cleared", removed });
  } catch (error) {
    next(error);
  }
};
