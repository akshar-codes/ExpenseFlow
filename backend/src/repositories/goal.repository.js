import mongoose from "mongoose";
import { Goal } from "../models/Goal.js";

/**
 * Builds a MongoDB filter object from allowed query params.
 */
function buildFilter(userId, params = {}) {
  const filter = { user: userId };

  if (params.status) filter.status = params.status;
  if (params.priority) filter.priority = params.priority;
  if (params.category) filter.category = params.category;

  if (
    params.minTargetAmount !== undefined ||
    params.maxTargetAmount !== undefined
  ) {
    filter.targetAmount = {};

    if (params.minTargetAmount !== undefined) {
      filter.targetAmount.$gte = Number(params.minTargetAmount);
    }

    if (params.maxTargetAmount !== undefined) {
      filter.targetAmount.$lte = Number(params.maxTargetAmount);
    }
  }

  if (params.targetDateFrom || params.targetDateTo) {
    filter.targetDate = {};

    if (params.targetDateFrom) {
      filter.targetDate.$gte = new Date(params.targetDateFrom);
    }

    if (params.targetDateTo) {
      filter.targetDate.$lte = new Date(params.targetDateTo);
    }
  }

  if (params.search) {
    filter.$or = [
      { title: { $regex: params.search, $options: "i" } },
      { description: { $regex: params.search, $options: "i" } },
      { category: { $regex: params.search, $options: "i" } },
    ];
  }

  return filter;
}

/**
 * Builds a sort object from sort param.
 */
function buildSort(sortBy = "createdAt", sortOrder = "desc") {
  const allowed = [
    "createdAt",
    "updatedAt",
    "targetDate",
    "targetAmount",
    "currentAmount",
    "priority",
    "title",
  ];

  const field = allowed.includes(sortBy) ? sortBy : "createdAt";

  return { [field]: sortOrder === "asc" ? 1 : -1 };
}

// ── CRUD ──────────────────────────────────────────────────────────────────────

export async function create(userId, data) {
  const goal = new Goal({ ...data, user: userId });
  return goal.save();
}

export async function findById(goalId, userId) {
  return Goal.findOne({ _id: goalId, user: userId });
}

export async function findAll(userId, params = {}) {
  const filter = buildFilter(userId, params);
  const sort = buildSort(params.sortBy, params.sortOrder);

  const page = Math.max(1, parseInt(params.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(params.limit, 10) || 10));
  const skip = (page - 1) * limit;

  const [goals, total] = await Promise.all([
    Goal.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean({ virtuals: true }),
    Goal.countDocuments(filter),
  ]);

  return {
    goals,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page < Math.ceil(total / limit),
      hasPrevPage: page > 1,
    },
  };
}

export async function update(goalId, userId, data) {
  // Find first so pre-save hooks fire (auto-complete logic)
  const goal = await Goal.findOne({ _id: goalId, user: userId });

  if (!goal) {
    return null;
  }

  Object.assign(goal, data);
  return goal.save();
}

export async function remove(goalId, userId) {
  return Goal.findOneAndDelete({ _id: goalId, user: userId });
}

// ── Statistics ────────────────────────────────────────────────────────────────

export async function getStatsByUser(userId) {
  const stats = await Goal.aggregate([
    {
      $match: {
        user: new mongoose.Types.ObjectId(userId),
      },
    },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
        totalTarget: { $sum: "$targetAmount" },
        totalCurrent: { $sum: "$currentAmount" },
      },
    },
  ]);

  const byStatus = {};

  for (const row of stats) {
    byStatus[row._id] = {
      count: row.count,
      totalTarget: Math.round(row.totalTarget * 100) / 100,
      totalCurrent: Math.round(row.totalCurrent * 100) / 100,
    };
  }

  const totalTarget = stats.reduce((s, r) => s + r.totalTarget, 0);
  const totalCurrent = stats.reduce((s, r) => s + r.totalCurrent, 0);

  return {
    byStatus,
    overall: {
      totalGoals: stats.reduce((s, r) => s + r.count, 0),
      totalTarget: Math.round(totalTarget * 100) / 100,
      totalCurrent: Math.round(totalCurrent * 100) / 100,
      overallProgress:
        totalTarget > 0
          ? Math.round((totalCurrent / totalTarget) * 10000) / 100
          : 0,
    },
  };
}

export async function getRecentlyCompleted(userId, limit = 5) {
  return Goal.find({
    user: userId,
    status: "completed",
  })
    .sort({ completedAt: -1 })
    .limit(limit)
    .lean({ virtuals: true });
}

export async function getActiveGoals(userId, limit = 5) {
  return Goal.find({
    user: userId,
    status: "active",
  })
    .sort({ targetDate: 1 })
    .limit(limit)
    .lean({ virtuals: true });
}
