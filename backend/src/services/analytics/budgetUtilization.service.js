import mongoose from "mongoose";
import Budget from "../../models/Budget.js";
import Transaction from "../../models/Transaction.js";
import { withTimeout } from "../../utils/aggregationUtils.js";
import { getMonthDateRange } from "../../utils/dateUtils.js";
import cache from "../../utils/cache.js";

const CACHE_TTL_MS = 10 * 60 * 1000;
const DEFAULT_MONTHS = 6;
const MAX_MONTHS = 24;

// Builds the last `months` (month, year) pairs, oldest first, inclusive of
// the current month — mirrors the bucket convention used by rolling.service.js.
const buildMonthYearPairs = (months, referenceDate) => {
  const pairs = [];
  const ref = new Date(
    Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth(), 1),
  );
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(
      Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth() - i, 1),
    );
    pairs.push({ month: d.getUTCMonth() + 1, year: d.getUTCFullYear() });
  }
  return pairs;
};

/**
 * Spend-vs-limit per category, tracked across N months.
 * Extends getBudgetStatusService's single-period pattern to a time series —
 * one entry per category, each with a per-month {limit, spent, percentage}.
 */
export const getBudgetUtilizationTrendService = async (
  userId,
  { months = DEFAULT_MONTHS, referenceDate = new Date() } = {},
) => {
  const clampedMonths = Math.min(Math.max(1, months), MAX_MONTHS);
  const dayKey = referenceDate.toISOString().slice(0, 10);
  const key = cache.buildKey(userId, "budgetUtilizationTrend", {
    months: clampedMonths,
    day: dayKey,
  });

  return cache.wrap(
    key,
    async () => {
      const pairs = buildMonthYearPairs(clampedMonths, referenceDate);

      const budgets = await Budget.aggregate(
        [
          {
            $match: {
              user: new mongoose.Types.ObjectId(userId),
              $or: pairs.map((p) => ({ month: p.month, year: p.year })),
            },
          },
          {
            $lookup: {
              from: "categories",
              localField: "category",
              foreignField: "_id",
              as: "categoryDoc",
            },
          },
          {
            $unwind: {
              path: "$categoryDoc",
              preserveNullAndEmptyArrays: false,
            },
          },
          {
            $project: {
              _id: 1,
              category: "$categoryDoc._id",
              categoryName: "$categoryDoc.name",
              limit: 1,
              month: 1,
              year: 1,
            },
          },
        ],
        withTimeout(),
      );

      if (budgets.length === 0) {
        return { range: { months: clampedMonths, pairs }, categories: [] };
      }

      const earliest = pairs[0];
      const latest = pairs[pairs.length - 1];
      const { startDate } = getMonthDateRange(earliest.month, earliest.year);
      const { endDate } = getMonthDateRange(latest.month, latest.year);

      const categoryIds = [
        ...new Set(budgets.map((b) => String(b.category))),
      ].map((id) => new mongoose.Types.ObjectId(id));

      const spendRaw = await Transaction.aggregate(
        [
          {
            $match: {
              user: new mongoose.Types.ObjectId(userId),
              type: "expense",
              category: { $in: categoryIds },
              date: { $gte: startDate, $lte: endDate },
            },
          },
          {
            $group: {
              _id: {
                category: "$category",
                month: { $month: { date: "$date", timezone: "UTC" } },
                year: { $year: { date: "$date", timezone: "UTC" } },
              },
              spent: { $sum: "$amount" },
            },
          },
        ],
        withTimeout(),
      );

      const spendMap = new Map();
      spendRaw.forEach((s) => {
        spendMap.set(
          `${s._id.category}-${s._id.year}-${s._id.month}`,
          Math.round(s.spent * 100) / 100,
        );
      });

      const byCategory = new Map();
      budgets.forEach((b) => {
        const idStr = String(b.category);
        if (!byCategory.has(idStr)) {
          byCategory.set(idStr, {
            categoryId: b.category,
            categoryName: b.categoryName,
            budgetByMonth: new Map(),
          });
        }
        byCategory
          .get(idStr)
          .budgetByMonth.set(`${b.year}-${b.month}`, b.limit);
      });

      const categories = Array.from(byCategory.values()).map((entry) => {
        const series = pairs.map(({ month, year }) => {
          const limit = entry.budgetByMonth.get(`${year}-${month}`) ?? null;
          const spent =
            spendMap.get(`${entry.categoryId}-${year}-${month}`) ?? 0;
          const percentage =
            limit && limit > 0
              ? Math.round((spent / limit) * 10000) / 100
              : null;
          return {
            month,
            year,
            limit,
            spent,
            percentage,
            exceeded: limit != null && spent > limit,
          };
        });

        const monthsWithBudget = series.filter((s) => s.limit != null);
        const avgUtilization =
          monthsWithBudget.length > 0
            ? Math.round(
                (monthsWithBudget.reduce(
                  (sum, s) => sum + (s.percentage ?? 0),
                  0,
                ) /
                  monthsWithBudget.length) *
                  100,
              ) / 100
            : null;

        return {
          categoryId: entry.categoryId,
          categoryName: entry.categoryName,
          series,
          avgUtilization,
        };
      });

      return { range: { months: clampedMonths, pairs }, categories };
    },
    { ttlMs: CACHE_TTL_MS },
  );
};
