import cron from "node-cron";
import mongoose from "mongoose";
import User from "../models/User.js";
import Transaction from "../models/Transaction.js";
import { enqueueEmail } from "../services/email/emailQueue.service.js";
import { EMAIL_TYPES } from "../models/NotificationPreference.js";
import { acquireJobLock, releaseJobLock } from "../utils/jobLock.js";
import logger from "../config/logger.js";

const LOCK_NAME = "monthly_summary_email";
const LOCK_TTL_MS = 9 * 60 * 1000;

const MONTH_LABELS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const getPriorMonthRange = (referenceDate = new Date()) => {
  const priorMonthDate = new Date(
    Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth() - 1, 1),
  );
  const month = priorMonthDate.getUTCMonth() + 1;
  const year = priorMonthDate.getUTCFullYear();
  const startDate = new Date(Date.UTC(year, month - 1, 1));
  const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
  return { startDate, endDate, month, year };
};

const summarizeMonth = async (userId, startDate, endDate) => {
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

  if (transactionCount === 0) return null;

  const topCategories = await Transaction.aggregate([
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
    { $limit: 5 },
    { $project: { _id: 0, name: 1, total: { $round: ["$total", 2] } } },
  ]);

  const balance = Math.round((income - expense) * 100) / 100;
  const savingsRate =
    income > 0 ? Math.round((balance / income) * 10000) / 100 : 0;

  return {
    income: Math.round(income * 100) / 100,
    expense: Math.round(expense * 100) / 100,
    balance,
    savingsRate,
    topCategories,
  };
};

const runJob = async () => {
  const acquired = await acquireJobLock(LOCK_NAME, LOCK_TTL_MS);
  if (!acquired) return;

  try {
    const { startDate, endDate, month, year } = getPriorMonthRange();
    const monthLabel = `${MONTH_LABELS[month - 1]} ${year}`;
    const dedupeKey = `monthlySummary:${year}-${month}`;

    const cursor = User.find({}).select("_id").lean().cursor();

    let queued = 0;
    for await (const user of cursor) {
      const stats = await summarizeMonth(user._id, startDate, endDate);
      if (!stats) continue;

      const result = await enqueueEmail({
        userId: user._id,
        type: EMAIL_TYPES.MONTHLY_SUMMARY,
        payload: { monthLabel, ...stats },
        dedupeKey,
      });

      if (result) queued++;
    }

    logger.info({ queued, monthLabel }, "monthlySummary: job complete");
  } catch (err) {
    logger.error({ err: err.message }, "monthlySummary: fatal error");
  } finally {
    await releaseJobLock(LOCK_NAME);
  }
};

export const startMonthlySummaryJob = () => {
  // 1st of every month at 08:00 UTC — summarizes the month that just ended.
  cron.schedule("0 8 1 * *", runJob);
  logger.info(
    "[monthly-summary] Scheduled for the 1st of each month, 08:00 UTC.",
  );
};

export const runMonthlySummaryJobOnce = runJob;
