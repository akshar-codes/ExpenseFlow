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

const router = express.Router();

// All goal routes require authentication
router.use(protect);

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

export default router;
