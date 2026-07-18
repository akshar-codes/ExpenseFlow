import Joi from "joi";

export const subscribeSchema = Joi.object({
  endpoint: Joi.string().uri().required().messages({
    "any.required": "endpoint is required",
    "string.uri": "endpoint must be a valid URL",
  }),

  expirationTime: Joi.number().allow(null).optional(),

  keys: Joi.object({
    p256dh: Joi.string().required().messages({
      "any.required": "keys.p256dh is required",
    }),
    auth: Joi.string().required().messages({
      "any.required": "keys.auth is required",
    }),
  })
    .required()
    .messages({ "any.required": "keys is required" }),
});

export const unsubscribeSchema = Joi.object({
  endpoint: Joi.string().uri().required().messages({
    "any.required": "endpoint is required",
    "string.uri": "endpoint must be a valid URL",
  }),
});
