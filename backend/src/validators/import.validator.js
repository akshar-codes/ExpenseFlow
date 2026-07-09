import Joi from "joi";
import { IMPORT_SOURCE } from "../utils/constants.js";

const CSV_CONTENT_MAX_LENGTH = 6_000_000;

const columnMappingSchema = Joi.object().pattern(
  Joi.string(),
  Joi.string().allow(""),
);

export const previewImportSchema = Joi.object({
  source: Joi.string()
    .valid(...Object.values(IMPORT_SOURCE))
    .required()
    .messages({
      "any.only": "Unsupported import source",
      "any.required": "source is required",
    }),

  csvContent: Joi.string()
    .min(1)
    .max(CSV_CONTENT_MAX_LENGTH)
    .required()
    .messages({
      "string.empty": "csvContent is required",
      "string.max": "CSV file is too large (max ~6MB)",
      "any.required": "csvContent is required",
    }),

  columnMapping: columnMappingSchema.optional(),
});

export const commitImportSchema = Joi.object({
  source: Joi.string()
    .valid(...Object.values(IMPORT_SOURCE))
    .required()
    .messages({
      "any.only": "Unsupported import source",
      "any.required": "source is required",
    }),

  csvContent: Joi.string()
    .min(1)
    .max(CSV_CONTENT_MAX_LENGTH)
    .required()
    .messages({
      "string.empty": "csvContent is required",
      "string.max": "CSV file is too large (max ~6MB)",
      "any.required": "csvContent is required",
    }),

  fileName: Joi.string().max(200).allow("").optional(),
  columnMapping: columnMappingSchema.optional(),
  skipDuplicates: Joi.boolean().default(true),
});
