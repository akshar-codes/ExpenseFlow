import mongoose from "mongoose";
import Transaction from "../../models/Transaction.js";
import Budget from "../../models/Budget.js";
import {
  matchUserAndRange,
  withTimeout,
} from "../../utils/aggregationUtils.js";
import { getRecentDaysRange } from "../../utils/dateRangeUtils.js";
import { utcMonthYear } from "../../utils/dateUtils.js";
import cache from "../../utils/cache.js";

const CACHE_TTL_MS = 5 * 60 * 1000;
const DEFAULT_DAYS = 30;
const MAX_DAYS = 90;

export const getSpendingVelocityService = async (
  userId,
  { days = DEFAULT_DAYS, referenceDate = new Date() } = {},
) => {
  const clampedDays = Math.min(Math.max(1, days), MAX_DAYS);
  const dayKey = referenceDate.toISOString().slice(0, 10);
  const key = cache.buildKey(userId, "spendingVelocity", {
    days: clampedDays,
    day: dayKey,
  });

  return cache.wrap(
    key,
    async () => {
      const { startDate, endDate } = getRecentDaysRange(
        clampedDays,
        referenceDate,
      );

      const byCategory = await Transaction.aggregate(
        [
          matchUserAndRange(userId, startDate, endDate, { type: "expense" }),
          {
            $lookup: {
              from: "categories",
              localField: "category",
              foreignField: "_id",
              as: "categoryDoc",
            },
          },
          {
            $unwind: { path: "$categoryDoc", preserveNullAndEmptyArrays: true },
          },
          {
            $group: {
              _id: "$category",
              categoryName: {
                $first: { $ifNull: ["$categoryDoc.name", "Unknown"] },
              },
              total: { $sum: "$amount" },
            },
          },
          {
            $project: {
              _id: 0,
              categoryId: "$_id",
              categoryName: 1,
              total: { $round: ["$total", 2] },
            },
          },
        ],
        withTimeout(),
      );

      const totalSpent =
        Math.round(byCategory.reduce((s, c) => s + c.total, 0) * 100) / 100;
      const dailyBurnRate = Math.round((totalSpent / clampedDays) * 100) / 100;

      const { month, year } = utcMonthYear(referenceDate);
      const categoryIds = byCategory
        .filter((c) => c.categoryId)
        .map((c) => new mongoose.Types.ObjectId(c.categoryId));

      const budgets = categoryIds.length
        ? await Budget.find({
            user: userId,
            category: { $in: categoryIds },
            month,
            year,
          }).lean()
        : [];

      const budgetMap = new Map(
        budgets.map((b) => [String(b.category), b.limit]),
      );

      const monthStart = new Date(Date.UTC(year, month - 1, 1));
      const monthToDateSpend = await Transaction.aggregate(
        [
          matchUserAndRange(userId, monthStart, referenceDate, {
            type: "expense",
          }),
          { $group: { _id: "$category", spent: { $sum: "$amount" } } },
        ],
        withTimeout(),
      );
      const spentMap = new Map(
        monthToDateSpend.map((s) => [String(s._id), s.spent]),
      );

      const categories = byCategory.map((c) => {
        const idStr = c.categoryId ? String(c.categoryId) : null;
        const limit = idStr ? budgetMap.get(idStr) : undefined;
        const categoryDailyRate =
          Math.round((c.total / clampedDays) * 100) / 100;

        let daysUntilExhausted = null;
        if (limit != null && categoryDailyRate > 0) {
          const spentSoFar = idStr ? (spentMap.get(idStr) ?? 0) : 0;
          const remaining = Math.max(0, limit - spentSoFar);
          daysUntilExhausted = Math.max(
            0,
            Math.floor(remaining / categoryDailyRate),
          );
        }

        return {
          categoryId: c.categoryId,
          categoryName: c.categoryName,
          total: c.total,
          dailyRate: categoryDailyRate,
          daysUntilExhausted,
        };
      });

      categories.sort((a, b) => b.total - a.total);

      return {
        range: { startDate, endDate, days: clampedDays },
        totalSpent,
        dailyBurnRate,
        categories,
      };
    },
    { ttlMs: CACHE_TTL_MS },
  );
};
