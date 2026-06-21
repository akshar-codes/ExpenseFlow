import Transaction from "../../models/Transaction.js";
import {
  matchUserAndRange,
  groupByIsoWeekAndType,
  withTimeout,
} from "../../utils/aggregationUtils.js";
import {
  getRecentWeekBuckets,
  getRecentWeeksRange,
} from "../../utils/dateRangeUtils.js";
import cache from "../../utils/cache.js";

const CACHE_TTL_MS = 5 * 60 * 1000;
const DEFAULT_WEEKS = 12;
const MAX_WEEKS = 52;

const fmtWeekLabel = (weekStart) =>
  weekStart.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });

export const getWeeklyTrendsService = async (
  userId,
  weeks = DEFAULT_WEEKS,
  referenceDate = new Date(),
) => {
  const clampedWeeks = Math.min(Math.max(1, weeks), MAX_WEEKS);
  const dayKey = referenceDate.toISOString().slice(0, 10);
  const key = cache.buildKey(userId, "weeklyTrends", {
    weeks: clampedWeeks,
    day: dayKey,
  });

  return cache.wrap(
    key,
    async () => {
      const { startDate, endDate } = getRecentWeeksRange(
        clampedWeeks,
        referenceDate,
      );
      const buckets = getRecentWeekBuckets(clampedWeeks, referenceDate);

      const raw = await Transaction.aggregate(
        [
          matchUserAndRange(userId, startDate, endDate),
          ...groupByIsoWeekAndType(),
        ],
        withTimeout(),
      );

      const rawMap = new Map(
        raw.map((r) => [`${r.isoYear}-${r.isoWeek}-${r.type}`, r.total]),
      );

      const series = buckets.map(({ weekStart, weekEnd, isoWeek, isoYear }) => {
        const income = rawMap.get(`${isoYear}-${isoWeek}-income`) ?? 0;
        const expense = rawMap.get(`${isoYear}-${isoWeek}-expense`) ?? 0;
        return {
          isoWeek,
          isoYear,
          weekStart,
          weekEnd,
          label: `${fmtWeekLabel(weekStart)}`,
          income,
          expense,
          net: Math.round((income - expense) * 100) / 100,
        };
      });

      return { range: { startDate, endDate, weeks: clampedWeeks }, series };
    },
    { ttlMs: CACHE_TTL_MS },
  );
};
