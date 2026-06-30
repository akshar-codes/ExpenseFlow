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

export const getLargestExpensesService = async (
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
  const key = cache.buildKey(userId, "largestExpenses", {
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
          matchUserAndRange(userId, startDate, endDate, { type }),
          { $sort: { amount: -1 } },
          { $limit: clampedLimit },
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
            $project: {
              _id: 1,
              amount: 1,
              date: 1,
              note: 1,
              merchant: 1,
              paymentMethod: 1,
              category: {
                _id: "$categoryDoc._id",
                name: "$categoryDoc.name",
              },
            },
          },
        ],
        withTimeout(),
      );

      return {
        range: { startDate, endDate, days: clampedDays },
        type,
        expenses: raw,
      };
    },
    { ttlMs: CACHE_TTL_MS },
  );
};
