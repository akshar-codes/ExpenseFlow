import cron from "node-cron";
import mongoose from "mongoose";
import User from "../models/User.js";
import Transaction from "../models/Transaction.js";
import { enqueueEmail } from "../services/email/emailQueue.service.js";
import { EMAIL_TYPES } from "../models/NotificationPreference.js";
import { acquireJobLock, releaseJobLock } from "../utils/jobLock.js";
import logger from "../config/logger.js";

const LOCK_NAME = "weekly_summary_email";
const LOCK_TTL_MS = 9 * 60 * 1000;

// ── Previous ISO week (Mon 00:00 UTC → Sun 23:59:59.999 UTC) ──────────────
const getPriorIsoWeekRange = (referenceDate = new Date()) => {
  const ref = new Date(
    Date.UTC(
      referenceDate.getUTCFullYear(),
      referenceDate.getUTCMonth(),
      referenceDate.getUTCDate(),
    ),
  );
  const isoDayNum = ref.getUTCDay() === 0 ? 7 : ref.getUTCDay();
  const thisWeekMonday = new Date(
    ref.getTime() - (isoDayNum - 1) * 24 * 60 * 60 * 1000,
  );
  const priorWeekStart = new Date(
    thisWeekMonday.getTime() - 7 * 24 * 60 * 60 * 1000,
  );
  const priorWeekEnd = new Date(thisWeekMonday.getTime() - 1); // Sun 23:59:59.999

  // ISO week number/year label for dedupeKey + display
  const d = new Date(priorWeekStart);
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const isoWeek = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);

  return {
    startDate: priorWeekStart,
    endDate: priorWeekEnd,
    isoWeek,
    isoYear: d.getUTCFullYear(),
  };
};

const summarizeWeek = async (userId, startDate, endDate) => {
  const totals = await Transaction.aggregate([
    {
      $match: {
        user: new mongoose.Types.ObjectId(userId),
        date: { $gte: startDate, $lte: endDate },
      },
    },
    { $group: { _id: "$type", total: { $sum: "$amount" }, count: { $sum: 1 } } },
  ]);

  let income = 0;
  let expense = 0;
  let transactionCount = 0;
  totals.forEach((t) => {
    if (t._id === "income") income = t.total;
    if (t._id === "expense") expense = t.total;
    transactionCount += t.count;
  });

  if (transactionCount === 0) return null; // nothing to report — skip email

  const [topCategoryRow] = await Transaction.aggregate([
    {
      $match: {
        user: new mongoose.Types.ObjectId(userId),
        type: "expense",
        date: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $lookup: {
        from: "categories",
        localField: "category",
        foreignField: "_id",
        as: "cat",
      },
    },
    { $unwind: { path: "$cat", preserveNullAndEmptyArrays: true } },
    {
      $group: {
        _id: "$category",
        name: { $first: { $ifNull: ["$cat.name", "Unknown"] } },
        total: { $sum: "$amount" },
      },
    },
    { $sort: { total: -1 } },
    { $limit: 1 },
  ]);

  return {
    income: Math.round(income * 100) / 100,
    expense: Math.round(expense * 100) / 100,
    balance: Math.round((income - expense) * 100) / 100,
    transactionCount,
    topCategory: topCategoryRow
      ? {
          name: topCategoryRow.name,
          total: Math.round(topCategoryRow.total * 100) / 100,
        }
      : null,
  };
};

const runJob = async () => {
  const acquired = await acquireJobLock(LOCK_NAME, LOCK_TTL_MS);
  if (!acquired) return;

  try {
    const { startDate, endDate, isoWeek, isoYear } = getPriorIsoWeekRange();
    const weekLabel = `Week ${isoWeek}, ${isoYear}`;
    const dedupeKey = `weeklySummary:${isoYear}-W${isoWeek}`;

    const cursor = User.find({}).select("_id").lean().cursor();

    let queued = 0;
    for await (const user of cursor) {
      const stats = await summarizeWeek(user._id, startDate, endDate);
      if (!stats) continue;

      const result = await enqueueEmail({
        userId: user._id,
        type: EMAIL_TYPES.WEEKLY_SUMMARY,
        payload: { weekLabel, ...stats },
        dedupeKey,
      });

      if (result) queued++;
    }

    logger.info({ queued, weekLabel }, "weeklySummary: job complete");
  } catch (err) {
    logger.error({ err: err.message }, "weeklySummary: fatal error");
  } finally {
    await releaseJobLock(LOCK_NAME);
  }
};

export const startWeeklySummaryJob = () => {
  // Every Monday at 08:00 UTC — summarizes the week that just ended.
  cron.schedule("0 8 * * 1", runJob);
  logger.info("[weekly-summary] Scheduled for Mondays 08:00 UTC.");
};

export const runWeeklySummaryJobOnce = runJob;
