import {
  matchUserAndRange,
  withTimeout,
} from "../../utils/aggregationUtils.js";
import {
  getRollingMonthsRange,
  getRollingMonthBuckets,
} from "../../utils/dateRangeUtils.js";
import Transaction from "../../models/Transaction.js";
import cache from "../../utils/cache.js";

const CACHE_TTL_MS = 5 * 60 * 1000;
const DEFAULT_MONTHS = 6;
const MAX_MONTHS = 24;

export const getCategoryTrendsService = async (
  userId,
  {
    months = DEFAULT_MONTHS,
    type = "expense",
    referenceDate = new Date(),
  } = {},
) => {
  const clampedMonths = Math.min(Math.max(1, months), MAX_MONTHS);
  const dayKey = referenceDate.toISOString().slice(0, 10);
  const key = cache.buildKey(userId, "categoryTrends", {
    months: clampedMonths,
    type,
    day: dayKey,
  });

  return cache.wrap(
    key,
    async () => {
      const { startDate, endDate } = getRollingMonthsRange(
        clampedMonths,
        referenceDate,
      );
      const buckets = getRollingMonthBuckets(clampedMonths, referenceDate);

      const raw = await Transaction.aggregate(
        [
          matchUserAndRange(userId, startDate, endDate, { type }),
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
              _id: {
                categoryId: "$category",
                categoryName: "$categoryDoc.name",
                month: { $month: { date: "$date", timezone: "UTC" } },
                year: { $year: { date: "$date", timezone: "UTC" } },
              },
              total: { $sum: "$amount" },
              count: { $sum: 1 },
            },
          },
        ],
        withTimeout(),
      );

      // categoryId(str) -> { categoryId, category, series: Map("year-month" -> point) }
      const categoryMap = new Map();

      raw.forEach((r) => {
        const idStr = r._id.categoryId
          ? String(r._id.categoryId)
          : "uncategorized";
        if (!categoryMap.has(idStr)) {
          categoryMap.set(idStr, {
            categoryId: r._id.categoryId ?? null,
            category: r._id.categoryName ?? "Unknown",
            series: new Map(),
          });
        }
        categoryMap.get(idStr).series.set(`${r._id.year}-${r._id.month}`, {
          total: Math.round(r.total * 100) / 100,
          count: r.count,
        });
      });

      const categories = Array.from(categoryMap.values())
        .map((entry) => {
          const series = buckets.map(({ month, year }) => {
            const point = entry.series.get(`${year}-${month}`);
            return {
              month,
              year,
              total: point?.total ?? 0,
              count: point?.count ?? 0,
            };
          });
          const totalAcrossRange =
            Math.round(series.reduce((s, p) => s + p.total, 0) * 100) / 100;

          return {
            categoryId: entry.categoryId,
            category: entry.category,
            series,
            totalAcrossRange,
          };
        })
        .sort((a, b) => b.totalAcrossRange - a.totalAcrossRange);

      return {
        range: { startDate, endDate, months: clampedMonths },
        type,
        categories,
      };
    },
    { ttlMs: CACHE_TTL_MS },
  );
};
