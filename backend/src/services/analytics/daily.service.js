import Transaction from "../../models/Transaction.js";
import {
  matchUserAndRange,
  groupByDayAndType,
  withTimeout,
} from "../../utils/aggregationUtils.js";
import { getRecentDaysRange } from "../../utils/dateRangeUtils.js";
import cache from "../../utils/cache.js";

const CACHE_TTL_MS = 5 * 60 * 1000;
const DEFAULT_DAYS = 30;
const MAX_DAYS = 90;

const toDayKey = (date) => date.toISOString().slice(0, 10);

export const getDailySpendingService = async (
  userId,
  days = DEFAULT_DAYS,
  referenceDate = new Date(),
) => {
  const clampedDays = Math.min(Math.max(1, days), MAX_DAYS);
  const refKey = toDayKey(referenceDate);
  const key = cache.buildKey(userId, "dailySpending", {
    days: clampedDays,
    day: refKey,
  });

  return cache.wrap(
    key,
    async () => {
      const { startDate, endDate } = getRecentDaysRange(
        clampedDays,
        referenceDate,
      );

      const raw = await Transaction.aggregate(
        [matchUserAndRange(userId, startDate, endDate), ...groupByDayAndType()],
        withTimeout(),
      );

      const rawMap = new Map(raw.map((r) => [`${r.day}-${r.type}`, r.total]));

      const series = [];
      for (let i = 0; i < clampedDays; i++) {
        const d = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
        const dKey = toDayKey(d);
        const income = rawMap.get(`${dKey}-income`) ?? 0;
        const expense = rawMap.get(`${dKey}-expense`) ?? 0;
        series.push({
          date: dKey,
          income,
          expense,
          net: Math.round((income - expense) * 100) / 100,
        });
      }

      const totalExpense = series.reduce((s, d) => s + d.expense, 0);

      return {
        range: { startDate, endDate, days: clampedDays },
        series,
        averageDailyExpense:
          Math.round((totalExpense / clampedDays) * 100) / 100,
      };
    },
    { ttlMs: CACHE_TTL_MS },
  );
};
