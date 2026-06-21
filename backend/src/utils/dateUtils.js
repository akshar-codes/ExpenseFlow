import { utcMidnight, getMonthDateRange } from "./dateUtils.js";

// ─── Rolling N-month window ────────────────────────────────────────────────

export const getRollingMonthsRange = (months, referenceDate = new Date()) => {
  if (!Number.isInteger(months) || months < 1) {
    throw new RangeError("months must be a positive integer");
  }

  const ref = utcMidnight(referenceDate);

  const startDate = new Date(
    Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth() - (months - 1), 1),
  );

  const endDate = new Date(
    Date.UTC(
      ref.getUTCFullYear(),
      ref.getUTCMonth(),
      ref.getUTCDate(),
      23,
      59,
      59,
      999,
    ),
  );

  return { startDate, endDate };
};

export const getRolling3MonthsRange = (referenceDate) =>
  getRollingMonthsRange(3, referenceDate);
export const getRolling6MonthsRange = (referenceDate) =>
  getRollingMonthsRange(6, referenceDate);
export const getRolling12MonthsRange = (referenceDate) =>
  getRollingMonthsRange(12, referenceDate);

// ─── Rolling window split into per-month buckets ───────────────────────────

export const getRollingMonthBuckets = (months, referenceDate = new Date()) => {
  const ref = utcMidnight(referenceDate);
  const buckets = [];

  for (let i = months - 1; i >= 0; i--) {
    const bucketDate = new Date(
      Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth() - i, 1),
    );
    const month = bucketDate.getUTCMonth() + 1;
    const year = bucketDate.getUTCFullYear();
    buckets.push({ month, year, ...getMonthDateRange(month, year) });
  }

  return buckets;
};

// ─── Year-over-year comparison pair ────────────────────────────────────────

export const getYearOverYearRanges = (year, { uptoToday = true } = {}) => {
  const numericYear = Number(year);
  const now = utcMidnight(new Date());
  const isCurrentYear = uptoToday && numericYear === now.getUTCFullYear();

  const currentEnd = isCurrentYear
    ? new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth(),
          now.getUTCDate(),
          23,
          59,
          59,
          999,
        ),
      )
    : new Date(Date.UTC(numericYear, 11, 31, 23, 59, 59, 999));

  const currentStart = new Date(Date.UTC(numericYear, 0, 1));

  const priorStart = new Date(Date.UTC(numericYear - 1, 0, 1));
  const priorEnd = isCurrentYear
    ? new Date(
        Date.UTC(
          numericYear - 1,
          now.getUTCMonth(),
          now.getUTCDate(),
          23,
          59,
          59,
          999,
        ),
      )
    : new Date(Date.UTC(numericYear - 1, 11, 31, 23, 59, 59, 999));

  return {
    current: {
      startDate: currentStart,
      endDate: currentEnd,
      year: numericYear,
    },
    prior: { startDate: priorStart, endDate: priorEnd, year: numericYear - 1 },
  };
};

// ─── Monthly comparison pair (this month vs a chosen prior month) ─────────

export const getMonthComparisonRanges = ({
  currentMonth,
  currentYear,
  priorMonth,
  priorYear,
} = {}) => {
  const now = utcMidnight(new Date());

  const cMonth = currentMonth ?? now.getUTCMonth() + 1;
  const cYear = currentYear ?? now.getUTCFullYear();

  // Default "prior" = the calendar month immediately before current.
  let pMonth = priorMonth;
  let pYear = priorYear;
  if (pMonth === undefined || pYear === undefined) {
    const priorDate = new Date(Date.UTC(cYear, cMonth - 1 - 1, 1));
    pMonth = priorDate.getUTCMonth() + 1;
    pYear = priorDate.getUTCFullYear();
  }

  return {
    current: {
      month: cMonth,
      year: cYear,
      ...getMonthDateRange(cMonth, cYear),
    },
    prior: { month: pMonth, year: pYear, ...getMonthDateRange(pMonth, pYear) },
  };
};

// ─── ISO week (Mon–Sun) boundaries ─────────────────────────────────────────

const ISO_DAY_MS = 24 * 60 * 60 * 1000;

export const getIsoWeekStart = (date) => {
  const d = utcMidnight(date);
  // getUTCDay(): 0 = Sunday … 6 = Saturday. ISO weeks start Monday.
  const isoDayNum = d.getUTCDay() === 0 ? 7 : d.getUTCDay();
  return new Date(d.getTime() - (isoDayNum - 1) * ISO_DAY_MS);
};

export const getRecentWeekBuckets = (weeks, referenceDate = new Date()) => {
  if (!Number.isInteger(weeks) || weeks < 1) {
    throw new RangeError("weeks must be a positive integer");
  }

  const currentWeekStart = getIsoWeekStart(referenceDate);
  const buckets = [];

  for (let i = weeks - 1; i >= 0; i--) {
    const weekStart = new Date(currentWeekStart.getTime() - i * 7 * ISO_DAY_MS);
    const weekEnd = new Date(
      weekStart.getTime() + 7 * ISO_DAY_MS - 1, // 23:59:59.999 on day 7
    );
    buckets.push({
      weekStart,
      weekEnd,
      isoWeek: getIsoWeekNumber(weekStart),
      isoYear: weekStart.getUTCFullYear(),
    });
  }

  return buckets;
};

function getIsoWeekNumber(date) {
  const d = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / ISO_DAY_MS + 1) / 7);
}

export const getRecentWeeksRange = (weeks, referenceDate = new Date()) => {
  const buckets = getRecentWeekBuckets(weeks, referenceDate);
  return {
    startDate: buckets[0].weekStart,
    endDate: buckets[buckets.length - 1].weekEnd,
  };
};

// ─── Recent N days range (for daily spending) ──────────────────────────────

export const getRecentDaysRange = (days, referenceDate = new Date()) => {
  if (!Number.isInteger(days) || days < 1) {
    throw new RangeError("days must be a positive integer");
  }

  const ref = utcMidnight(referenceDate);
  const startDate = new Date(ref.getTime() - (days - 1) * ISO_DAY_MS);
  const endDate = new Date(
    Date.UTC(
      ref.getUTCFullYear(),
      ref.getUTCMonth(),
      ref.getUTCDate(),
      23,
      59,
      59,
      999,
    ),
  );

  return { startDate, endDate };
};

// ─── Generic custom range validator/normalizer ─────────────────────────────

export const normalizeCustomRange = (startDateInput, endDateInput) => {
  if (!startDateInput || !endDateInput) {
    throw new RangeError("startDate and endDate are both required");
  }

  const startDate = utcMidnight(new Date(startDateInput));
  const endRaw = new Date(endDateInput);
  const endDate = new Date(
    Date.UTC(
      endRaw.getUTCFullYear(),
      endRaw.getUTCMonth(),
      endRaw.getUTCDate(),
      23,
      59,
      59,
      999,
    ),
  );

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    throw new RangeError("startDate/endDate must be valid dates");
  }
  if (startDate > endDate) {
    throw new RangeError("startDate must be on or before endDate");
  }

  return { startDate, endDate };
};
