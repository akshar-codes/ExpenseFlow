import mongoose from "mongoose";
import { Goal } from "../models/Goal.js";
import Transaction from "../models/Transaction.js";
import { ServiceError } from "../utils/ServiceError.js";
import * as contributionRepo from "../repositories/contribution.repository.js";
import { CONTRIBUTION_SOURCE } from "../models/Contribution.js";
import { enqueueEmail } from "./email/emailQueue.service.js";
import { EMAIL_TYPES } from "../models/NotificationPreference.js";
import logger from "../config/logger.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Run `fn(session)` inside a Mongoose session/transaction.
 * Falls back to sequential execution on standalone MongoDB instances
 * (e.g. local dev without a replica set).
 */
async function withSession(fn) {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await fn(session);
    });
    return result;
  } catch (err) {
    if (
      err.codeName === "CommandNotSupportedOnStandalone" ||
      err.message?.includes("Transaction numbers") ||
      err.message?.includes("standalone")
    ) {
      // Replica set not available — run without session
      return fn(null);
    }
    throw err;
  } finally {
    session.endSession();
  }
}

/**
 * Enqueue a "goal completed" email exactly once per goal, guarded by
 */
export function notifyGoalCompleted(userId, goal, createdAt) {
  const daysToComplete = createdAt
    ? Math.round((Date.now() - new Date(createdAt).getTime()) / 86400000)
    : null;

  enqueueEmail({
    userId,
    type: EMAIL_TYPES.GOAL_COMPLETED,
    payload: {
      goalTitle: goal.title,
      targetAmount: goal.targetAmount,
      daysToComplete,
    },
    dedupeKey: `goalCompleted:${goal._id}`,
  }).catch((err) =>
    logger.error(
      { err: err.message, goalId: goal._id },
      "notifyGoalCompleted: failed to enqueue goal completed email",
    ),
  );
}

/**
 * Apply a delta to Goal.currentAmount and let the pre-save hook
 * handle auto-completion logic.
 */
async function applyDeltaToGoal(goalId, userId, delta, session) {
  const goal = await Goal.findOne(
    { _id: goalId, user: userId },
    null,
    session ? { session } : {},
  );
  if (!goal) throw new ServiceError("Goal not found", 404);

  const wasCompleted = goal.status === "completed";
  const createdAt = goal.createdAt;

  goal.currentAmount = Math.max(
    0,
    Math.round((goal.currentAmount + delta) * 100) / 100,
  );
  const saved = await goal.save(session ? { session } : {});

  if (!wasCompleted && saved.status === "completed") {
    notifyGoalCompleted(userId, saved, createdAt);
  }

  return saved;
}

// ─── ADD CONTRIBUTION (manual) ────────────────────────────────────────────────


export async function addContribution(userId, goalId, body) {
  const { amount, note = "", date, allowOverSaving = false } = body;

  if (!amount || typeof amount !== "number" || amount <= 0) {
    throw new ServiceError("amount must be a positive number", 400);
  }
  if (amount > 1_000_000_000) {
    throw new ServiceError("amount cannot exceed ₹1,000,000,000", 400);
  }

  // Validate goal belongs to user
  const goal = await Goal.findOne({ _id: goalId, user: userId });
  if (!goal) throw new ServiceError("Goal not found", 404);

  if (goal.status === "cancelled") {
    throw new ServiceError("Cannot contribute to a cancelled goal", 400);
  }

  // Over-saving guard
  if (!allowOverSaving) {
    const projected = Math.round((goal.currentAmount + amount) * 100) / 100;
    if (projected > goal.targetAmount) {
      const headroom = Math.max(
        0,
        Math.round((goal.targetAmount - goal.currentAmount) * 100) / 100,
      );
      throw new ServiceError(
        `This contribution would exceed the target by ₹${(projected - goal.targetAmount).toFixed(2)}. ` +
          `Remaining headroom: ₹${headroom.toFixed(2)}. ` +
          `Pass allowOverSaving=true to proceed anyway.`,
        422,
      );
    }
  }

  const snapshotBefore = goal.currentAmount;

  return withSession(async (session) => {
    const updatedGoal = await applyDeltaToGoal(goalId, userId, amount, session);

    const contribution = await contributionRepo.create(
      {
        user: userId,
        goal: goalId,
        amount,
        note,
        date: date ? new Date(date) : new Date(),
        source: CONTRIBUTION_SOURCE.MANUAL,
        snapshotBefore,
        snapshotAfter: updatedGoal.currentAmount,
      },
      session,
    );

    logger.info(
      { contributionId: contribution._id, goalId, userId, amount },
      "Contribution added",
    );

    return { contribution, goal: updatedGoal };
  });
}

// ─── LINK TRANSACTION ─────────────────────────────────────────────────────────


export async function linkTransaction(userId, goalId, body) {
  const { transactionId, amount, note = "", allowOverSaving = false } = body;

  if (!transactionId) {
    throw new ServiceError("transactionId is required", 400);
  }

  // Validate transaction ownership
  const transaction = await Transaction.findOne({
    _id: transactionId,
    user: userId,
  });
  if (!transaction) {
    throw new ServiceError(
      "Transaction not found or does not belong to you",
      404,
    );
  }

  const contributionAmount =
    amount != null ? Number(amount) : transaction.amount;

  if (!isFinite(contributionAmount) || contributionAmount <= 0) {
    throw new ServiceError("amount must be a positive number", 400);
  }
  if (contributionAmount > transaction.amount) {
    throw new ServiceError(
      `amount (₹${contributionAmount}) cannot exceed the transaction amount (₹${transaction.amount})`,
      400,
    );
  }

  const goal = await Goal.findOne({ _id: goalId, user: userId });
  if (!goal) throw new ServiceError("Goal not found", 404);

  if (goal.status === "cancelled") {
    throw new ServiceError("Cannot contribute to a cancelled goal", 400);
  }

  if (!allowOverSaving) {
    const projected =
      Math.round((goal.currentAmount + contributionAmount) * 100) / 100;
    if (projected > goal.targetAmount) {
      throw new ServiceError(
        `This would exceed the target by ₹${(projected - goal.targetAmount).toFixed(2)}. ` +
          `Pass allowOverSaving=true to proceed anyway.`,
        422,
      );
    }
  }

  const snapshotBefore = goal.currentAmount;

  return withSession(async (session) => {
    const updatedGoal = await applyDeltaToGoal(
      goalId,
      userId,
      contributionAmount,
      session,
    );

    const contribution = await contributionRepo.create(
      {
        user: userId,
        goal: goalId,
        amount: contributionAmount,
        note,
        date: transaction.date,
        source: CONTRIBUTION_SOURCE.LINKED,
        transaction: transactionId,
        snapshotBefore,
        snapshotAfter: updatedGoal.currentAmount,
      },
      session,
    );

    logger.info(
      {
        contributionId: contribution._id,
        transactionId,
        goalId,
        userId,
        amount: contributionAmount,
      },
      "Transaction linked as contribution",
    );

    return { contribution, goal: updatedGoal };
  });
}

// ─── UNDO CONTRIBUTION ────────────────────────────────────────────────────────

/**
 * Reverse a contribution:
 */
export async function undoContribution(userId, contributionId) {
  const contribution = await contributionRepo.findById(contributionId, userId);
  if (!contribution) {
    throw new ServiceError("Contribution not found or already undone", 404);
  }

  const goal = await Goal.findOne({ _id: contribution.goal, user: userId });
  if (!goal) throw new ServiceError("Goal not found", 404);

  return withSession(async (session) => {
    const undone = await contributionRepo.softUndo(
      contributionId,
      userId,
      session,
    );

    if (!undone)
      throw new ServiceError("Contribution not found or already undone", 404);

    // Subtract and let pre-save hook reopen goal if it was completed
    goal.currentAmount = Math.max(
      0,
      Math.round((goal.currentAmount - contribution.amount) * 100) / 100,
    );
    const updatedGoal = await goal.save(session ? { session } : {});

    logger.info(
      { contributionId, goalId: goal._id, userId, amount: contribution.amount },
      "Contribution undone",
    );

    return { contribution: undone, goal: updatedGoal };
  });
}

// ─── GET CONTRIBUTION HISTORY ─────────────────────────────────────────────────

export async function getContributions(userId, goalId, params = {}) {
  // Validate goal belongs to user
  const goal = await Goal.findOne({ _id: goalId, user: userId });
  if (!goal) throw new ServiceError("Goal not found", 404);

  const result = await contributionRepo.findAll(userId, goalId, params);
  return { ...result, goal };
}

// ─── MONTHLY SAVINGS CHART ────────────────────────────────────────────────────

export async function getMonthlySavings(userId, year) {
  const numericYear = Number(year);
  if (
    !Number.isInteger(numericYear) ||
    numericYear < 2000 ||
    numericYear > 2100
  ) {
    throw new ServiceError(
      "year must be an integer between 2000 and 2100",
      400,
    );
  }

  const raw = await contributionRepo.monthlySavings(userId, numericYear);

  // Fill all 12 months with 0 so the chart always has a full dataset
  const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
  const map = Object.fromEntries(raw.map((r) => [r.month, r.total]));

  return MONTHS.map((m) => ({
    month: m,
    total: map[m] ?? 0,
  }));
}

// ─── RECENT CONTRIBUTIONS (dashboard) ────────────────────────────────────────

export async function getRecentContributions(userId, limit = 5) {
  return contributionRepo.recentByUser(userId, limit);
}
