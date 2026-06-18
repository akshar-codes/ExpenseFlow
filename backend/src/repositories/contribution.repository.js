import mongoose from "mongoose";
import Contribution from "../models/Contribution.js";

// ── CREATE ────────────────────────────────────────────────────────────────────

export async function create(data, session = null) {
  const [doc] = await Contribution.create([data], session ? { session } : {});
  return doc;
}

// ── FIND BY ID (user-scoped) ──────────────────────────────────────────────────

export async function findById(contributionId, userId) {
  return Contribution.findOne({
    _id: contributionId,
    user: userId,
    isUndone: false,
  })
    .populate("goal", "title color")
    .populate("transaction", "type amount date note");
}

// ── LIST (paginated, user + goal scoped) ──────────────────────────────────────

export async function findAll(userId, goalId, params = {}) {
  const page = Math.max(1, parseInt(params.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(params.limit, 10) || 20));
  const skip = (page - 1) * limit;

  const filter = { user: userId, goal: goalId };
  if (!params.includeUndone) filter.isUndone = false;

  const [contributions, total] = await Promise.all([
    Contribution.find(filter)
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("transaction", "type amount date note category")
      .lean(),
    Contribution.countDocuments(filter),
  ]);

  return {
    contributions,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 0,
      hasNextPage: page < Math.ceil(total / limit),
      hasPrevPage: page > 1,
    },
  };
}

// ── MONTHLY SAVINGS AGGREGATION ───────────────────────────────────────────────

export async function monthlySavings(userId, year) {
  const start = new Date(Date.UTC(year, 0, 1));
  const end = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));

  return Contribution.aggregate([
    {
      $match: {
        user: new mongoose.Types.ObjectId(userId),
        isUndone: false,
        date: { $gte: start, $lte: end },
      },
    },
    {
      $group: {
        _id: { $month: { date: "$date", timezone: "UTC" } },
        total: { $sum: "$amount" },
      },
    },
    {
      $project: {
        _id: 0,
        month: "$_id",
        total: { $round: ["$total", 2] },
      },
    },
    { $sort: { month: 1 } },
  ]);
}

// ── RECENT CONTRIBUTIONS (dashboard widget) ───────────────────────────────────

export async function recentByUser(userId, limit = 5) {
  return Contribution.find({ user: userId, isUndone: false })
    .sort({ date: -1, createdAt: -1 })
    .limit(limit)
    .populate("goal", "title color")
    .lean();
}

// ── SOFT UNDO ─────────────────────────────────────────────────────────────────

export async function softUndo(contributionId, userId, session = null) {
  return Contribution.findOneAndUpdate(
    { _id: contributionId, user: userId, isUndone: false },
    { $set: { isUndone: true, undoneAt: new Date() } },
    { new: true, ...(session ? { session } : {}) },
  );
}

// ── SUM FOR GOAL (live recalculation check) ───────────────────────────────────

export async function sumForGoal(goalId) {
  const [result] = await Contribution.aggregate([
    {
      $match: {
        goal: new mongoose.Types.ObjectId(goalId),
        isUndone: false,
      },
    },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);
  return result?.total ?? 0;
}
