import * as goalService from "../services/goal.service.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

// ── GET /api/goals ────────────────────────────────────────────────────────────

export const listGoals = asyncHandler(async (req, res) => {
  const result = await goalService.getGoals(req.user.id, req.query);

  res.json({
    success: true,
    data: result.goals,
    pagination: result.pagination,
  });
});

// ── POST /api/goals ───────────────────────────────────────────────────────────

export const createGoal = asyncHandler(async (req, res) => {
  const goal = await goalService.createGoal(req.user.id, req.body);

  res.status(201).json({
    success: true,
    data: goal,
  });
});

// ── GET /api/goals/statistics ─────────────────────────────────────────────────

export const getStatistics = asyncHandler(async (req, res) => {
  const stats = await goalService.getGoalStatistics(req.user.id);

  res.json({
    success: true,
    data: stats,
  });
});

// ── GET /api/goals/dashboard ──────────────────────────────────────────────────

export const getDashboard = asyncHandler(async (req, res) => {
  const data = await goalService.getDashboardData(req.user.id);

  res.json({
    success: true,
    data,
  });
});

// ── GET /api/goals/:id ────────────────────────────────────────────────────────

export const getGoal = asyncHandler(async (req, res) => {
  const goal = await goalService.getGoalById(req.params.id, req.user.id);

  res.json({
    success: true,
    data: goal,
  });
});

// ── PUT /api/goals/:id ────────────────────────────────────────────────────────

export const updateGoal = asyncHandler(async (req, res) => {
  const goal = await goalService.updateGoal(
    req.params.id,
    req.user.id,
    req.body,
  );

  res.json({
    success: true,
    data: goal,
  });
});

// ── DELETE /api/goals/:id ─────────────────────────────────────────────────────

export const deleteGoal = asyncHandler(async (req, res) => {
  await goalService.deleteGoal(req.params.id, req.user.id);

  res.json({
    success: true,
    message: "Goal deleted successfully",
  });
});
