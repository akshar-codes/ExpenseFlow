import Joi from "joi";

const objectId = Joi.string()
  .pattern(/^[a-f\d]{24}$/i)
  .messages({ "string.pattern.base": "must be a valid ObjectId" });

export const listReceiptsSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(10),
  status: Joi.string().valid("processing", "processed", "failed", "confirmed"),
});

export const updateExtractedFieldsSchema = Joi.object({
  merchant: Joi.string().trim().max(150).allow(""),
  amount: Joi.number().positive().max(1_000_000_000),
  date: Joi.date().iso().max("now"),
  tax: Joi.number().min(0).max(1_000_000_000),
})
  .min(1)
  .messages({ "object.min": "At least one field must be provided to update" });

export const confirmReceiptSchema = Joi.object({
  categoryId: objectId.required().messages({
    "any.required": "categoryId is required",
  }),

  amount: Joi.number().positive().max(1_000_000_000).required().messages({
    "any.required": "amount is required",
    "number.positive": "amount must be greater than zero",
  }),

  date: Joi.date().iso().max("now").required().messages({
    "any.required": "date is required",
    "date.max": "date cannot be in the future",
  }),

  merchant: Joi.string().trim().max(150).allow("").optional(),

  tax: Joi.number().min(0).max(1_000_000_000).optional(),

  note: Joi.string().max(200).allow("").optional(),

  paymentMethod: Joi.string().valid("cash", "upi", "card", "bank").optional(),
});
