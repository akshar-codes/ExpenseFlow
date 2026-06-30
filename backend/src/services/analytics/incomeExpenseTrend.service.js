import Transaction from "../../models/Transaction.js";
import {
  matchUserAndRange,
  groupByMonthAndType,
  withTimeout,
} from "../../utils/aggregationUtils.js";
import {
  getRollingMonthsRange,
  getRollingMonthBuckets,
} from "../../utils/dateRangeUtils.js";
import cache from "../../utils/cache.js";

const CACHE_TTL_MS = 5 * 60 * 1000;
const DEFAULT_MONTHS = 12;
const MAX_MONTHS = 24;

export const getIncomeExpenseTrendService = async (
  userId,
  { months = DEFAULT_MONTHS, referenceDate = new Date() } = {},
) => {
  const clampedMonths = Math.min(Math.max(1, months), MAX_MONTHS);
  const dayKey = referenceDate.toISOString().slice(0, 10);
  const key = cache.buildKey(userId, "incomeExpenseTrend", {
    months: clampedMonths,
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
          matchUserAndRange(userId, startDate, endDate),
          ...groupByMonthAndType(),
        ],
        withTimeout(),
      );

      const rawMap = new Map(
        raw.map((r) => [`${r.year}-${r.month}-${r.type}`, r.total]),
      );

      const series = buckets.map(({ month, year }) => {
        const income = rawMap.get(`${year}-${month}-income`) ?? 0;
        const expense = rawMap.get(`${year}-${month}-expense`) ?? 0;
        const savingsRate =
          income > 0
            ? Math.round(((income - expense) / income) * 10000) / 100
            : 0;
        return {
          month,
          year,
          income,
          expense,
          net: Math.round((income - expense) * 100) / 100,
          savingsRate,
        };
      });

      return { range: { startDate, endDate, months: clampedMonths }, series };
    },
    { ttlMs: CACHE_TTL_MS },
  );
};
