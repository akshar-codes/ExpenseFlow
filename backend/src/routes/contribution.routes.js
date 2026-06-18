import express from "express";
import { protect } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  addContributionSchema,
  linkTransactionSchema,
  listContributionsSchema,
  monthlySavingsSchema,
} from "../validators/contribution.validator.js";
import {
  addContribution,
  linkTransaction,
  getContributions,
  undoContribution,
  getMonthlySavings,
  getRecentContributions,
} from "../controllers/contribution.controller.js";

const router = express.Router({ mergeParams: true });

// All contribution routes require authentication
router.use(protect);

// ── Aggregate / cross-goal routes (no :goalId param) ─────────────────────────

router.get(
  "/monthly",
  validate(monthlySavingsSchema, "query"),
  getMonthlySavings,
);

router.get("/recent", getRecentContributions);

// ── Per-goal contribution routes (:goalId injected via mergeParams) ───────────

router.post("/", validate(addContributionSchema), addContribution);

router.post("/link", validate(linkTransactionSchema), linkTransaction);

router.get("/", validate(listContributionsSchema, "query"), getContributions);

router.delete("/:id", undoContribution);

export default router;
