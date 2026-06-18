import express from "express";

import { protect } from "../middlewares/auth.middleware.js";
import {
  validateCreateGoal,
  validateUpdateGoal,
  validateListGoals,
} from "../validators/goal.validator.js";

import {
  listGoals,
  createGoal,
  getStatistics,
  getDashboard,
  getGoal,
  updateGoal,
  deleteGoal,
} from "../controllers/goal.controller.js";

import contributionRouter from "./contribution.routes.js";

const router = express.Router();

// All goal routes require authentication
router.use(protect);

// ── Aggregate contribution routes (static, must come before :id) ──────────────
// Mounts GET /api/goals/contributions/monthly and /recent
router.use("/contributions", contributionRouter);

// ── Static sub-routes before :id ──────────────────────────────────────────────

router.get("/statistics", getStatistics);
router.get("/dashboard", getDashboard);

// ── Collection ────────────────────────────────────────────────────────────────

router.get("/", validateListGoals, listGoals);
router.post("/", validateCreateGoal, createGoal);

// ── Individual resource ───────────────────────────────────────────────────────

router.get("/:id", getGoal);
router.put("/:id", validateUpdateGoal, updateGoal);
router.delete("/:id", deleteGoal);

// ── Per-goal contribution sub-routes ─────────────────────────────────────────
// POST   /api/goals/:goalId/contributions
// POST   /api/goals/:goalId/contributions/link
// GET    /api/goals/:goalId/contributions
// DELETE /api/goals/:goalId/contributions/:id

router.use("/:goalId/contributions", contributionRouter);

export default router;
