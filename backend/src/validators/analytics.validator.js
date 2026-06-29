import Joi from "joi";

// Validator for /analytics/monthly
export const monthlySchema = Joi.object({
  month: Joi.number().integer().min(1).max(12).required().messages({
    "any.required": "Month is required",
    "number.base": "Month must be a number",
    "number.min": "Month must be between 1 and 12",
    "number.max": "Month must be between 1 and 12",
  }),
  year: Joi.number().integer().min(2000).max(2100).required().messages({
    "any.required": "Year is required",
    "number.base": "Year must be a number",
    "number.min": "Year must be >= 2000",
    "number.max": "Year must be <= 2100",
  }),
});

// Validator for /analytics/categories
export const categoriesSchema = Joi.object({
  type: Joi.string().valid("income", "expense").required().messages({
    "any.required": "Transaction type is required",
    "any.only": "Transaction type must be either 'income' or 'expense'",
  }),
  month: Joi.number().integer().min(1).max(12).optional(),
  year: Joi.number().integer().min(2000).max(2100).optional(),
});

// Validator for /analytics/trend
export const trendSchema = Joi.object({
  year: Joi.number().integer().min(2000).max(2100).required().messages({
    "any.required": "Year is required",
    "number.base": "Year must be a number",
    "number.min": "Year must be >= 2000",
    "number.max": "Year must be <= 2100",
  }),
});

// Validator for /analytics/rolling (generic, arbitrary window size)
export const rollingCustomSchema = Joi.object({
  months: Joi.number().integer().min(1).max(24).required().messages({
    "any.required": "months is required",
    "number.base": "months must be a number",
    "number.min": "months must be at least 1",
    "number.max": "months cannot exceed 24",
  }),
});

// Validator for /analytics/yoy
export const yearOverYearSchema = Joi.object({
  year: Joi.number().integer().min(2000).max(2100).required().messages({
    "any.required": "year is required",
    "number.base": "year must be a number",
    "number.min": "year must be >= 2000",
    "number.max": "year must be <= 2100",
  }),
});

// Validator for /analytics/compare-months
const monthYearPair = (prefix) => ({
  [`${prefix}Month`]: Joi.number().integer().min(1).max(12),
  [`${prefix}Year`]: Joi.number().integer().min(2000).max(2100),
});

export const monthComparisonSchema = Joi.object({
  ...monthYearPair("current"),
  ...monthYearPair("prior"),
})
  .and("currentMonth", "currentYear")
  .and("priorMonth", "priorYear")
  .messages({
    "object.and":
      "currentMonth/currentYear must be provided together, and priorMonth/priorYear must be provided together",
  });

// Validator for /analytics/weekly
export const weeklyTrendsSchema = Joi.object({
  weeks: Joi.number().integer().min(1).max(52).default(12).messages({
    "number.base": "weeks must be a number",
    "number.min": "weeks must be at least 1",
    "number.max": "weeks cannot exceed 52",
  }),
});

// Validator for /analytics/daily
export const dailySpendingSchema = Joi.object({
  days: Joi.number().integer().min(1).max(90).default(30).messages({
    "number.base": "days must be a number",
    "number.min": "days must be at least 1",
    "number.max": "days cannot exceed 90",
  }),
});

export const categoryTrendsSchema = Joi.object({
  months: Joi.number().integer().min(1).max(24).default(6),
  type: Joi.string().valid("income", "expense").default("expense"),
});

export const topMerchantsSchema = Joi.object({
  days: Joi.number().integer().min(1).max(365).default(90),
  type: Joi.string().valid("income", "expense").default("expense"),
  limit: Joi.number().integer().min(1).max(50).default(10),
});

export const budgetUtilizationSchema = Joi.object({
  months: Joi.number().integer().min(1).max(24).default(6),
});

export const largestExpensesSchema = Joi.object({
  days: Joi.number().integer().min(1).max(365).default(90),
  type: Joi.string().valid("income", "expense").default("expense"),
  limit: Joi.number().integer().min(1).max(50).default(10),
});

export const spendingVelocitySchema = Joi.object({
  days: Joi.number().integer().min(1).max(90).default(30),
});

export const incomeExpenseTrendSchema = Joi.object({
  months: Joi.number().integer().min(1).max(24).default(12),
});
