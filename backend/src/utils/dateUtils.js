// ─── UTC midnight for a given JS Date (defaults to today) ────────────────────

export const utcMidnight = (date = new Date()) =>
  new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );

/** Convenience: UTC midnight of today. */
export const utcMidnightToday = () => utcMidnight(new Date());

// ─── Month date range ─────────────────────────────────────────────────────────

export const getMonthDateRange = (month, year) => {
  const startDate = new Date(Date.UTC(year, month - 1, 1));
  // Day 0 of the NEXT month = last day of the current month
  const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
  return { startDate, endDate };
};

// ─── Year date range ──────────────────────────────────────────────────────────

export const getYearDateRange = (year) => ({
  startDate: new Date(Date.UTC(year, 0, 1)),
  endDate: new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999)),
});

// ─── UTC date components ──────────────────────────────────────────────────────

export const utcMonthYear = (date) => ({
  month: date.getUTCMonth() + 1,
  year: date.getUTCFullYear(),
});
