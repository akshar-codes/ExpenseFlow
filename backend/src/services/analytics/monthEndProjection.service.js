import Transaction from "../../models/Transaction.js";
import {
  matchUserAndRange,
  withTimeout,
} from "../../utils/aggregationUtils.js";
import { getMonthDateRange, utcMidnight } from "../../utils/dateUtils.js";
import cache from "../../utils/cache.js";

const CACHE_TTL_MS = 5 * 60 * 1000;

export const getMonthEndProjectionService = async (
  userId,
  { referenceDate = new Date() } = {},
) => {
  const today = utcMidnight(referenceDate);
  const dayKey = today.toISOString().slice(0, 10);
  const key = cache.buildKey(userId, "monthEndProjection", { day: dayKey });

  return cache.wrap(
    key,
    async () => {
      const month = today.getUTCMonth() + 1;
      const year = today.getUTCFullYear();
      const { startDate, endDate: monthEnd } = getMonthDateRange(month, year);

      const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
      const dayOfMonth = today.getUTCDate();
      const elapsedDays = Math.min(dayOfMonth, daysInMonth);
      const daysRemaining = Math.max(0, daysInMonth - elapsedDays);

      // Month-to-date, inclusive of today
      const monthToDateEnd = new Date(
        Date.UTC(
          today.getUTCFullYear(),
          today.getUTCMonth(),
          today.getUTCDate(),
          23,
          59,
          59,
          999,
        ),
      );

      const raw = await Transaction.aggregate(
        [
          matchUserAndRange(userId, startDate, monthToDateEnd),
          { $group: { _id: "$type", total: { $sum: "$amount" } } },
        ],
        withTimeout(),
      );

      let incomeSoFar = 0;
      let expenseSoFar = 0;
      raw.forEach((r) => {
        if (r._id === "income") incomeSoFar = r.total;
        if (r._id === "expense") expenseSoFar = r.total;
      });

      const incomeDailyRate = elapsedDays > 0 ? incomeSoFar / elapsedDays : 0;
      const expenseDailyRate = elapsedDays > 0 ? expenseSoFar / elapsedDays : 0;

      const projectedIncome =
        Math.round((incomeSoFar + incomeDailyRate * daysRemaining) * 100) / 100;
      const projectedExpense =
        Math.round((expenseSoFar + expenseDailyRate * daysRemaining) * 100) /
        100;
      const projectedBalance =
        Math.round((projectedIncome - projectedExpense) * 100) / 100;

      return {
        month,
        year,
        daysInMonth,
        elapsedDays,
        daysRemaining,
        incomeSoFar: Math.round(incomeSoFar * 100) / 100,
        expenseSoFar: Math.round(expenseSoFar * 100) / 100,
        projectedIncome,
        projectedExpense,
        projectedBalance,
      };
    },
    { ttlMs: CACHE_TTL_MS },
  );
};
