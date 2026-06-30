import Transaction from "../../models/Transaction.js";
import {
  matchUserAndRange,
  withTimeout,
} from "../../utils/aggregationUtils.js";
import { getRecentDaysRange } from "../../utils/dateRangeUtils.js";
import cache from "../../utils/cache.js";

const CACHE_TTL_MS = 5 * 60 * 1000;
const DEFAULT_DAYS = 90;
const MAX_DAYS = 365;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

export const getTopMerchantsService = async (
  userId,
  {
    days = DEFAULT_DAYS,
    type = "expense",
    limit = DEFAULT_LIMIT,
    referenceDate = new Date(),
  } = {},
) => {
  const clampedDays = Math.min(Math.max(1, days), MAX_DAYS);
  const clampedLimit = Math.min(Math.max(1, limit), MAX_LIMIT);
  const dayKey = referenceDate.toISOString().slice(0, 10);
  const key = cache.buildKey(userId, "topMerchants", {
    days: clampedDays,
    type,
    limit: clampedLimit,
    day: dayKey,
  });

  return cache.wrap(
    key,
    async () => {
      const { startDate, endDate } = getRecentDaysRange(
        clampedDays,
        referenceDate,
      );

      const raw = await Transaction.aggregate(
        [
          matchUserAndRange(userId, startDate, endDate, {
            type,
            normalizedMerchant: { $ne: null },
          }),
          {
            $group: {
              _id: "$normalizedMerchant",
              total: { $sum: "$amount" },
              count: { $sum: 1 },
              // Keep one original-cased label for display
              displayName: { $first: "$merchant" },
              lastDate: { $max: "$date" },
            },
          },
          {
            $project: {
              _id: 0,
              merchant: "$displayName",
              normalizedMerchant: "$_id",
              total: { $round: ["$total", 2] },
              count: 1,
              lastDate: 1,
            },
          },
          { $sort: { total: -1 } },
          { $limit: clampedLimit },
        ],
        withTimeout(),
      );

      const totalSpent =
        Math.round(raw.reduce((s, m) => s + m.total, 0) * 100) / 100;

      return {
        range: { startDate, endDate, days: clampedDays },
        type,
        merchants: raw,
        totalSpent,
      };
    },
    { ttlMs: CACHE_TTL_MS },
  );
};
