import mongoose from "mongoose";

// ─── $match: user + date range (the universal first stage) ────────────────

export const matchUserAndRange = (userId, startDate, endDate, extra = {}) => ({
  $match: {
    user: new mongoose.Types.ObjectId(userId),
    date: { $gte: startDate, $lte: endDate },
    ...extra,
  },
});

// ─── $lookup + $unwind category, in one composable pair ───────────────────

export const categoryLookupAndUnwind = (asField = "categoryDoc") => [
  {
    $lookup: {
      from: "categories",
      localField: "category",
      foreignField: "_id",
      as: asField,
    },
  },
  { $unwind: { path: `$${asField}`, preserveNullAndEmptyArrays: true } },
];

// ─── $round helper for $project / $group output stages ────────────────────

export const roundField = (expr, decimals = 2) => ({
  $round: [expr, decimals],
});

// ─── Group-by-month (UTC) key, reusable across trend/rolling pipelines ────

export const groupByMonthAndType = () => [
  {
    $group: {
      _id: {
        month: { $month: { date: "$date", timezone: "UTC" } },
        year: { $year: { date: "$date", timezone: "UTC" } },
        type: "$type",
      },
      total: { $sum: "$amount" },
      count: { $sum: 1 },
    },
  },
  {
    $project: {
      _id: 0,
      month: "$_id.month",
      year: "$_id.year",
      type: "$_id.type",
      total: roundField("$total"),
      count: 1,
    },
  },
  { $sort: { year: 1, month: 1, type: 1 } },
];

// ─── Group-by-ISO-week, UTC ─────────────────────────────────────────────────

export const groupByIsoWeekAndType = () => [
  {
    $group: {
      _id: {
        isoWeek: { $isoWeek: "$date" },
        isoYear: { $isoWeekYear: "$date" },
        type: "$type",
      },
      total: { $sum: "$amount" },
      count: { $sum: 1 },
    },
  },
  {
    $project: {
      _id: 0,
      isoWeek: "$_id.isoWeek",
      isoYear: "$_id.isoYear",
      type: "$_id.type",
      total: roundField("$total"),
      count: 1,
    },
  },
  { $sort: { isoYear: 1, isoWeek: 1, type: 1 } },
];

// ─── Group-by-day (UTC) ──────────────────────────────────────────────────────

export const groupByDayAndType = () => [
  {
    $group: {
      _id: {
        day: {
          $dateToString: { format: "%Y-%m-%d", date: "$date", timezone: "UTC" },
        },
        type: "$type",
      },
      total: { $sum: "$amount" },
      count: { $sum: 1 },
    },
  },
  {
    $project: {
      _id: 0,
      day: "$_id.day",
      type: "$_id.type",
      total: roundField("$total"),
      count: 1,
    },
  },
  { $sort: { day: 1, type: 1 } },
];

// ─── Group-by-category (with name resolved via lookup) ─────────────────────

export const groupByCategory = (extraMatch = {}) => [
  ...(Object.keys(extraMatch).length ? [{ $match: extraMatch }] : []),
  ...categoryLookupAndUnwind(),
  {
    $group: {
      _id: {
        categoryId: "$category",
        categoryName: "$categoryDoc.name",
      },
      total: { $sum: "$amount" },
      count: { $sum: 1 },
      avgAmount: { $avg: "$amount" },
    },
  },
  {
    $project: {
      _id: 0,
      category: { $ifNull: ["$_id.categoryName", "Unknown"] },
      categoryId: "$_id.categoryId",
      total: roundField("$total"),
      count: 1,
      avgAmount: roundField("$avgAmount"),
    },
  },
  { $sort: { total: -1 } },
];

// ─── Standard query options applied to every analytics aggregation ────────

export const ANALYTICS_QUERY_TIMEOUT_MS = 10_000;

export const withTimeout = (options = {}) => ({
  maxTimeMS: ANALYTICS_QUERY_TIMEOUT_MS,
  ...options,
});
