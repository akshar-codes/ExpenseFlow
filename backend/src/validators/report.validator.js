import Joi from "joi";
import { REPORT_SECTION_KEYS } from "../models/Report.js";

export const generateReportSchema = Joi.object({
  type: Joi.string().valid("monthly", "custom").required().messages({
    "any.required": "type is required",
    "any.only": "type must be 'monthly' or 'custom'",
  }),

  month: Joi.number()
    .integer()
    .min(1)
    .max(12)
    .when("type", {
      is: "monthly",
      then: Joi.required(),
      otherwise: Joi.forbidden(),
    }),

  year: Joi.number()
    .integer()
    .min(2000)
    .max(2100)
    .when("type", {
      is: "monthly",
      then: Joi.required(),
      otherwise: Joi.forbidden(),
    }),

  startDate: Joi.date()
    .iso()
    .when("type", {
      is: "custom",
      then: Joi.required(),
      otherwise: Joi.forbidden(),
    }),

  endDate: Joi.date()
    .iso()
    .min(Joi.ref("startDate"))
    .when("type", {
      is: "custom",
      then: Joi.required(),
      otherwise: Joi.forbidden(),
    })
    .messages({ "date.min": "endDate must be on or after startDate" }),

  sections: Joi.array()
    .items(Joi.string().valid(...REPORT_SECTION_KEYS))
    .min(1)
    .optional(),
});

export const emailReportSchema = Joi.object({
  to: Joi.string().email().required().messages({
    "any.required": "to is required",
    "string.email": "to must be a valid email address",
  }),
});

export const listReportsSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(10),
});
