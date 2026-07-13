import Joi from "joi";
import {
  CONFIGURABLE_EMAIL_TYPES,
  SUMMARY_FREQUENCY,
} from "../models/NotificationPreference.js";

const emailTypesSchema = Joi.object(
  Object.fromEntries(
    CONFIGURABLE_EMAIL_TYPES.map((type) => [type, Joi.boolean()]),
  ),
);

export const updatePreferencesSchema = Joi.object({
  emailEnabled: Joi.boolean(),
  summaryFrequency: Joi.string().valid(...Object.values(SUMMARY_FREQUENCY)),
  emailTypes: emailTypesSchema,
  goalReminderLeadDays: Joi.number().integer().min(1).max(30),
  recurringReminderLeadDays: Joi.number().integer().min(0).max(7),
})
  .min(1)
  .messages({ "object.min": "At least one field must be provided to update" });

export const unsubscribeSchema = Joi.object({
  token: Joi.string().hex().length(48).required().messages({
    "any.required": "token is required",
    "string.hex": "Invalid unsubscribe token",
    "string.length": "Invalid unsubscribe token",
  }),
});
