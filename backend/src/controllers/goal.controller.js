import * as goalService from "../services/goal.service.js";

// ── GET /api/goals ────────────────────────────────────────────────────────────

export const listGoals = async (req, res, next) => {
  try {
    const result = await goalService.getGoals(req.user.id, req.query);

    res.json({
      success: true,
      data: result.goals,
      pagination: result.pagination,
    });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/goals ───────────────────────────────────────────────────────────

export const createGoal = async (req, res, next) => {
  try {
    const goal = await goalService.createGoal(req.user.id, req.body);

    res.status(201).json({
      success: true,
      data: goal,
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/goals/statistics ─────────────────────────────────────────────────

export const getStatistics = async (req, res, next) => {
  try {
    const stats = await goalService.getGoalStatistics(req.user.id);

    res.json({
      success: true,
      data: stats,
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/goals/dashboard ──────────────────────────────────────────────────

export const getDashboard = async (req, res, next) => {
  try {
    const data = await goalService.getDashboardData(req.user.id);

    res.json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/goals/:id ────────────────────────────────────────────────────────

export const getGoal = async (req, res, next) => {
  try {
    const goal = await goalService.getGoalById(req.params.id, req.user.id);

    res.json({
      success: true,
      data: goal,
    });
  } catch (err) {
    next(err);
  }
};

// ── PUT /api/goals/:id ────────────────────────────────────────────────────────

export const updateGoal = async (req, res, next) => {
  try {
    const goal = await goalService.updateGoal(
      req.params.id,
      req.user.id,
      req.body,
    );

    res.json({
      success: true,
      data: goal,
    });
  } catch (err) {
    next(err);
  }
};

// ── DELETE /api/goals/:id ─────────────────────────────────────────────────────

export const deleteGoal = async (req, res, next) => {
  try {
    await goalService.deleteGoal(req.params.id, req.user.id);

    res.json({
      success: true,
      message: "Goal deleted successfully",
    });
  } catch (err) {
    next(err);
  }
};
