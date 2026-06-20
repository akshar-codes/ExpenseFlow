import Joi from "joi";

const HEX_COLOR = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

const ALLOWED_STATUSES = ["active", "paused", "cancelled", "completed"];
const ALLOWED_PRIORITIES = ["low", "medium", "high"];
const ALLOWED_SORT_FIELDS = [
  "createdAt",
  "updatedAt",
  "targetDate",
  "targetAmount",
  "currentAmount",
  "priority",
  "title",
];

// ── Create ────────────────────────────────────────────────────────────────────

const createGoalSchema = Joi.object({
  title: Joi.string().trim().min(1).max(100).required(),
  description: Joi.string().trim().max(500).allow("").default(""),
  targetAmount: Joi.number().positive().precision(2).required(),
  currentAmount: Joi.number().min(0).precision(2).default(0),
  targetDate: Joi.date().iso().greater("now").required().messages({
    "date.greater": "Target date must be in the future",
  }),
  priority: Joi.string()
    .valid(...ALLOWED_PRIORITIES)
    .default("medium"),
  category: Joi.string().trim().max(50).allow("").default(""),
  status: Joi.string()
    .valid(...ALLOWED_STATUSES)
    .default("active"),
  icon: Joi.string().trim().max(50).default("target"),
  color: Joi.string().pattern(HEX_COLOR).default("#6366f1").messages({
    "string.pattern.base": "Color must be a valid hex color (e.g. #6366f1)",
  }),
});

// ── Update ────────────────────────────────────────────────────────────────────

const updateGoalSchema = Joi.object({
  title: Joi.string().trim().min(1).max(100),
  description: Joi.string().trim().max(500).allow(""),
  targetAmount: Joi.number().positive().precision(2),
  currentAmount: Joi.number().min(0).precision(2),
  targetDate: Joi.date().iso(),
  priority: Joi.string().valid(...ALLOWED_PRIORITIES),
  category: Joi.string().trim().max(50).allow(""),
  status: Joi.string().valid(...ALLOWED_STATUSES),
  icon: Joi.string().trim().max(50),
  color: Joi.string().pattern(HEX_COLOR).messages({
    "string.pattern.base": "Color must be a valid hex color (e.g. #6366f1)",
  }),
}).min(1);

// ── List query params ─────────────────────────────────────────────────────────

const listGoalsSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  status: Joi.string().valid(...ALLOWED_STATUSES),
  priority: Joi.string().valid(...ALLOWED_PRIORITIES),
  category: Joi.string().trim().max(50),
  search: Joi.string().trim().max(100),
  sortBy: Joi.string()
    .valid(...ALLOWED_SORT_FIELDS)
    .default("createdAt"),
  sortOrder: Joi.string().valid("asc", "desc").default("desc"),
  minTargetAmount: Joi.number().min(0),
  maxTargetAmount: Joi.number().min(0),
  targetDateFrom: Joi.date().iso(),
  targetDateTo: Joi.date().iso(),
});

// ── Middleware factory ─────────────────────────────────────────────────────────

// REPLACE the validate function at the bottom of the file

function validate(schema, source = "body") {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[source], {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const details = error.details.map((d) => ({
        field: d.path.join("."),
        message: d.message,
      }));

      return res.status(422).json({
        success: false,
        error: "Validation failed",
        details,
      });
    }

    if (source === "query") {
      // Express 5: req.query is getter-only — direct assignment throws
      Object.keys(req.query).forEach((key) => delete req.query[key]);
      Object.assign(req.query, value);
    } else {
      req[source] = value;
    }

    next();
  };
}
export const validateCreateGoal = validate(createGoalSchema, "body");
export const validateUpdateGoal = validate(updateGoalSchema, "body");
export const validateListGoals = validate(listGoalsSchema, "query");
