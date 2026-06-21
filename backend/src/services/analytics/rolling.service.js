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

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const CACHE_TTL_MS = 5 * 60 * 1000;

const computeRollingAnalytics = async (userId, months, referenceDate) => {
  const { startDate, endDate } = getRollingMonthsRange(months, referenceDate);
  const buckets = getRollingMonthBuckets(months, referenceDate);

  const raw = await Transaction.aggregate(
    [matchUserAndRange(userId, startDate, endDate), ...groupByMonthAndType()],
    withTimeout(),
  );

  // Build a lookup so we can zero-fill buckets with no data.
  const rawMap = new Map(
    raw.map((r) => [`${r.year}-${r.month}-${r.type}`, r.total]),
  );

  const series = buckets.map(({ month, year }) => {
    const income = rawMap.get(`${year}-${month}-income`) ?? 0;
    const expense = rawMap.get(`${year}-${month}-expense`) ?? 0;
    return {
      month,
      year,
      label: `${MONTH_LABELS[month - 1]} ${year}`,
      income,
      expense,
      net: Math.round((income - expense) * 100) / 100,
    };
  });

  const totals = series.reduce(
    (acc, b) => ({
      income: acc.income + b.income,
      expense: acc.expense + b.expense,
    }),
    { income: 0, expense: 0 },
  );

  return {
    range: { startDate, endDate, months },
    series,
    totals: {
      income: Math.round(totals.income * 100) / 100,
      expense: Math.round(totals.expense * 100) / 100,
      net: Math.round((totals.income - totals.expense) * 100) / 100,
      averageMonthlyIncome: Math.round((totals.income / months) * 100) / 100,
      averageMonthlyExpense: Math.round((totals.expense / months) * 100) / 100,
    },
  };
};

const rollingService =
  (months) =>
  async (userId, referenceDate = new Date()) => {
    const dayKey = referenceDate.toISOString().slice(0, 10);
    const key = cache.buildKey(userId, `rolling${months}m`, { day: dayKey });

    return cache.wrap(
      key,
      () => computeRollingAnalytics(userId, months, referenceDate),
      { ttlMs: CACHE_TTL_MS },
    );
  };

export const getRolling3MonthsService = rollingService(3);
export const getRolling6MonthsService = rollingService(6);
export const getRolling12MonthsService = rollingService(12);

export const getRollingMonthsService = async (
  userId,
  months,
  referenceDate = new Date(),
) => {
  const dayKey = referenceDate.toISOString().slice(0, 10);
  const key = cache.buildKey(userId, `rolling${months}m`, { day: dayKey });
  return cache.wrap(
    key,
    () => computeRollingAnalytics(userId, months, referenceDate),
    { ttlMs: CACHE_TTL_MS },
  );
};
