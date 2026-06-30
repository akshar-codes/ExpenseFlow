// backend/src/utils/dateUtils.js
// Core UTC date primitives used across services.

// ─── UTC midnight normaliser ──────────────────────────────────────────────────

export const utcMidnight = (date) =>
  new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );

// ─── Month/year range (full calendar month, UTC) ──────────────────────────────

export const getMonthDateRange = (month, year) => {
  const startDate = new Date(Date.UTC(year, month - 1, 1));
  const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
  return { startDate, endDate };
};

// ─── Full calendar year range (UTC) ──────────────────────────────────────────

export const getYearDateRange = (year) => {
  const startDate = new Date(Date.UTC(year, 0, 1));
  const endDate = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));
  return { startDate, endDate };
};

// ─── Extract UTC month + year from a Date ────────────────────────────────────

export const utcMonthYear = (date) => ({
  month: date.getUTCMonth() + 1,
  year: date.getUTCFullYear(),
});
