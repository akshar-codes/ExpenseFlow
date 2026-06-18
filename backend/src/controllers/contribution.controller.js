import * as contributionService from "../services/contribution.service.js";
import { ServiceError } from "../utils/ServiceError.js";

const handleError = (err, res, next) => {
  if (err instanceof ServiceError) {
    return res.status(err.statusCode).json({ message: err.message });
  }
  next(err);
};

// ── POST /api/goals/:goalId/contributions ─────────────────────────────────────
export const addContribution = async (req, res, next) => {
  try {
    const { contribution, goal } = await contributionService.addContribution(
      req.user._id,
      req.params.goalId,
      req.body,
    );
    res.status(201).json({ success: true, data: { contribution, goal } });
  } catch (err) {
    handleError(err, res, next);
  }
};

// ── POST /api/goals/:goalId/contributions/link ────────────────────────────────
export const linkTransaction = async (req, res, next) => {
  try {
    const { contribution, goal } = await contributionService.linkTransaction(
      req.user._id,
      req.params.goalId,
      req.body,
    );
    res.status(201).json({ success: true, data: { contribution, goal } });
  } catch (err) {
    handleError(err, res, next);
  }
};

// ── GET /api/goals/:goalId/contributions ──────────────────────────────────────
export const getContributions = async (req, res, next) => {
  try {
    const result = await contributionService.getContributions(
      req.user._id,
      req.params.goalId,
      req.query,
    );
    res.json({ success: true, ...result });
  } catch (err) {
    handleError(err, res, next);
  }
};

// ── DELETE /api/goals/:goalId/contributions/:id (soft undo) ──────────────────
export const undoContribution = async (req, res, next) => {
  try {
    const { contribution, goal } = await contributionService.undoContribution(
      req.user._id,
      req.params.id,
    );
    res.json({ success: true, data: { contribution, goal } });
  } catch (err) {
    handleError(err, res, next);
  }
};

// ── GET /api/goals/contributions/monthly ─────────────────────────────────────
export const getMonthlySavings = async (req, res, next) => {
  try {
    const data = await contributionService.getMonthlySavings(
      req.user._id,
      req.query.year,
    );
    res.json({ success: true, data });
  } catch (err) {
    handleError(err, res, next);
  }
};

// ── GET /api/goals/contributions/recent ──────────────────────────────────────
export const getRecentContributions = async (req, res, next) => {
  try {
    const limit = Math.min(20, Math.max(1, parseInt(req.query.limit) || 5));
    const data = await contributionService.getRecentContributions(
      req.user._id,
      limit,
    );
    res.json({ success: true, data });
  } catch (err) {
    handleError(err, res, next);
  }
};
