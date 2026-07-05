import Joi from "joi";

export const getInsightsSchema = Joi.object({
  month: Joi.number().integer().min(1).max(12).optional().messages({
    "number.min": "month must be between 1 and 12",
    "number.max": "month must be between 1 and 12",
  }),
  year: Joi.number().integer().min(2000).max(2100).optional().messages({
    "number.min": "year must be >= 2000",
    "number.max": "year must be <= 2100",
  }),
  // force=true bypasses the cache and calls the AI provider fresh
  force: Joi.boolean().default(false),
});
