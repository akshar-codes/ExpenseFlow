import * as goalRepository from "../repositories/goal.repository.js";
import logger from "../config/logger.js";

export class GoalNotFoundError extends Error {
  constructor(id) {
    super(`Goal not found: ${id}`);
    this.name = "GoalNotFoundError";
    this.statusCode = 404;
  }
}

export class GoalForbiddenError extends Error {
  constructor() {
    super("Access denied to this goal");
    this.name = "GoalForbiddenError";
    this.statusCode = 403;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function enrichGoal(goal) {
  // goal is a plain object (lean) or Mongoose doc — virtuals may already be set
  const raw = goal.toObject ? goal.toObject() : { ...goal };

  const targetAmount = raw.targetAmount ?? 0;
  const currentAmount = raw.currentAmount ?? 0;

  raw.progressPercentage =
    targetAmount > 0
      ? Math.min(Math.round((currentAmount / targetAmount) * 10000) / 100, 100)
      : 0;

  raw.remainingAmount = Math.max(
    Math.round((targetAmount - currentAmount) * 100) / 100,
    0,
  );

  const now = new Date();
  const target = new Date(raw.targetDate);

  raw.daysRemaining = Math.ceil((target - now) / (1000 * 60 * 60 * 24));

  raw.isOverdue = raw.status === "active" && now > target;

  return raw;
}

// ── Service methods ───────────────────────────────────────────────────────────

export async function createGoal(userId, data) {
  const goal = await goalRepository.create(userId, data);

  logger.info({ goalId: goal._id, userId }, "Goal created");

  return enrichGoal(goal);
}

export async function getGoals(userId, queryParams) {
  const result = await goalRepository.findAll(userId, queryParams);

  result.goals = result.goals.map(enrichGoal);

  return result;
}

export async function getGoalById(goalId, userId) {
  const goal = await goalRepository.findById(goalId, userId);

  if (!goal) {
    throw new GoalNotFoundError(goalId);
  }

  return enrichGoal(goal);
}

export async function updateGoal(goalId, userId, data) {
  const updated = await goalRepository.update(goalId, userId, data);

  if (!updated) {
    throw new GoalNotFoundError(goalId);
  }

  logger.info({ goalId, userId }, "Goal updated");

  return enrichGoal(updated);
}

export async function deleteGoal(goalId, userId) {
  const deleted = await goalRepository.remove(goalId, userId);

  if (!deleted) {
    throw new GoalNotFoundError(goalId);
  }

  logger.info({ goalId, userId }, "Goal deleted");

  return deleted;
}

export async function getGoalStatistics(userId) {
  return goalRepository.getStatsByUser(userId);
}

export async function getDashboardData(userId) {
  const [activeGoals, recentlyCompleted, statistics] = await Promise.all([
    goalRepository.getActiveGoals(userId, 5),
    goalRepository.getRecentlyCompleted(userId, 3),
    goalRepository.getStatsByUser(userId),
  ]);

  return {
    activeGoals: activeGoals.map(enrichGoal),
    recentlyCompleted: recentlyCompleted.map(enrichGoal),
    statistics,
  };
}
