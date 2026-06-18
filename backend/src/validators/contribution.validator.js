import Joi from "joi";

// ── Add manual contribution ───────────────────────────────────────────────────

export const addContributionSchema = Joi.object({
  amount: Joi.number().positive().max(1_000_000_000).required().messages({
    "number.positive": "amount must be greater than zero",
    "number.max": "amount cannot exceed ₹1,000,000,000",
    "any.required": "amount is required",
  }),

  note: Joi.string().max(200).allow("").default(""),

  date: Joi.date().iso().max("now").optional().messages({
    "date.format": "date must be an ISO 8601 date string",
    "date.max": "date cannot be in the future",
  }),

  // When true, allows the total to exceed goal.targetAmount
  allowOverSaving: Joi.boolean().default(false),
});

// ── Link transaction ──────────────────────────────────────────────────────────

export const linkTransactionSchema = Joi.object({
  transactionId: Joi.string()
    .pattern(/^[a-f\d]{24}$/i)
    .required()
    .messages({
      "string.pattern.base": "transactionId must be a valid ObjectId",
      "any.required": "transactionId is required",
    }),

  // Optional partial amount — defaults to the full transaction amount
  amount: Joi.number().positive().max(1_000_000_000).optional().messages({
    "number.positive": "amount must be greater than zero",
  }),

  note: Joi.string().max(200).allow("").default(""),

  allowOverSaving: Joi.boolean().default(false),
});

// ── List query ────────────────────────────────────────────────────────────────

export const listContributionsSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  includeUndone: Joi.boolean().default(false),
});

// ── Monthly savings chart ─────────────────────────────────────────────────────

export const monthlySavingsSchema = Joi.object({
  year: Joi.number().integer().min(2000).max(2100).required().messages({
    "any.required": "year is required",
    "number.min": "year must be >= 2000",
    "number.max": "year must be <= 2100",
  }),
});
