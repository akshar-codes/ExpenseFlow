import mongoose from "mongoose";
import Transaction from "../models/Transaction.js";
import Budget from "../models/Budget.js";
import Category from "../models/Category.js";
import {
  getMonthDateRange,
  getYearDateRange,
  utcMonthYear,
} from "../utils/dateUtils.js";
import { ServiceError } from "../utils/ServiceError.js";
import { enqueueEmail } from "./email/emailQueue.service.js";
import { sendPushToUser } from "./push/push.service.js";
import { EMAIL_TYPES } from "../models/NotificationPreference.js";
import logger from "../config/logger.js";

const MAX_AMOUNT = 1_000_000_000;

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const buildFilter = (userId, query) => {
  const { type, category, startDate, endDate, month, year } = query;
  const filter = { user: new mongoose.Types.ObjectId(userId) };

  if (type && ["income", "expense"].includes(type)) filter.type = type;

  if (category && mongoose.Types.ObjectId.isValid(category))
    filter.category = new mongoose.Types.ObjectId(category);

  if (startDate || endDate) {
    filter.date = {};
    if (startDate) filter.date.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setUTCHours(23, 59, 59, 999);
      filter.date.$lte = end;
    }
  } else if (month && year) {
    const { startDate: s, endDate: e } = getMonthDateRange(
      Number(month),
      Number(year),
    );
    filter.date = { $gte: s, $lte: e };
  } else if (year) {
    const { startDate: s, endDate: e } = getYearDateRange(Number(year));
    filter.date = { $gte: s, $lte: e };
  }

  return filter;
};

const buildSort = (sort) => {
  switch (sort) {
    case "oldest":
      return { date: 1 };
    case "highest":
      return { amount: -1, date: -1 };
    case "lowest":
      return { amount: 1, date: -1 };
    default:
      return { date: -1 };
  }
};

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// ─── Budget-warning check (shared by create) ───────────────────────────────────

const checkBudgetWarning = async (userId, category, amount, date) => {
  const { month, year } = utcMonthYear(new Date(date));

  const budget = await Budget.findOne({
    user: userId,
    category: new mongoose.Types.ObjectId(category),
    month,
    year,
  }).populate("category", "name");

  if (!budget) return { budgetWarning: false, warningMessage: "" };

  const { startDate, endDate } = getMonthDateRange(month, year);

  const [agg] = await Transaction.aggregate([
    {
      $match: {
        user: userId,
        type: "expense",
        category: new mongoose.Types.ObjectId(category),
        date: { $gte: startDate, $lte: endDate },
      },
    },
    { $group: { _id: null, spent: { $sum: "$amount" } } },
  ]);

  const spentCents = Math.round((agg?.spent || 0) * 100);
  const newAmountCents = Math.round(amount * 100);
  const limitCents = Math.round(budget.limit * 100);
  const newTotalCents = spentCents + newAmountCents;
  const percentage = Math.round((newTotalCents / limitCents) * 10000) / 100;
  const exceeded = newTotalCents > limitCents;

  if (percentage >= 80) {
    const categoryName = budget.category?.name ?? "this category";

    enqueueEmail({
      userId,
      type: EMAIL_TYPES.BUDGET_WARNING,
      payload: {
        categoryName,
        limit: budget.limit,
        spent: Math.round(newTotalCents) / 100,
        percentage,
        exceeded,
        monthLabel: `${MONTH_NAMES[month - 1]} ${year}`,
      },
      dedupeKey: `budgetWarning:${category}:${year}-${month}`,
    }).catch((err) =>
      logger.error(
        { err: err.message, userId, category },
        "checkBudgetWarning: failed to enqueue budget warning email",
      ),
    );

    // Push mirrors the email for users who have the app installed as a
    // PWA — fire-and-forget, never blocks the transaction response, and
    // silently no-ops if the user has no push subscriptions or the server
    // has no VAPID keys configured (see push/webPush.config.js).
    sendPushToUser(userId, {
      title: exceeded ? "Budget exceeded" : "Budget warning",
      body: `${categoryName} is at ${percentage}% of its ${MONTH_NAMES[month - 1]} budget.`,
      url: "/categories",
      tag: `budget-${category}-${year}-${month}`,
    }).catch((err) =>
      logger.error(
        { err: err.message, userId, category },
        "checkBudgetWarning: failed to send push notification",
      ),
    );
  }

  if (exceeded) {
    const overspendRupees = ((newTotalCents - limitCents) / 100).toFixed(2);
    return {
      budgetWarning: true,
      warningMessage: `You exceeded your budget by ₹${overspendRupees}`,
    };
  }

  return { budgetWarning: false, warningMessage: "" };
};

// ─── CREATE ───────────────────────────────────────────────────────────────────

export const createTransactionService = async (userId, body) => {
  const { type, amount, category, note, date, paymentMethod } = body;

  if (!type || !amount || !category || !date) {
    throw new ServiceError("Required fields missing", 400);
  }

  const parsedAmount = Number(amount);
  if (
    !isFinite(parsedAmount) ||
    parsedAmount <= 0 ||
    parsedAmount > MAX_AMOUNT
  ) {
    throw new ServiceError(
      `Amount must be a positive finite number no greater than ${MAX_AMOUNT}`,
      400,
    );
  }

  const categoryDoc = await Category.findOne({ _id: category, user: userId });
  if (!categoryDoc) {
    throw new ServiceError("Category not found or does not belong to you", 400);
  }

  let budgetWarning = false;
  let warningMessage = "";

  if (type === "expense") {
    ({ budgetWarning, warningMessage } = await checkBudgetWarning(
      userId,
      category,
      parsedAmount,
      date,
    ));
  }

  const transaction = await Transaction.create({
    user: userId,
    type,
    amount: parsedAmount,
    category,
    note,
    date,
    paymentMethod,
  });

  return { transaction, budgetWarning, warningMessage };
};

// ─── LIST ─────────────────────────────────────────────────────────────────────

export const listTransactionsService = async (userId, query) => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 10));
  const skip = (page - 1) * limit;
  const sort = buildSort(query.sort);
  const search = query.search?.trim() || "";
  const filter = buildFilter(userId, query);

  if (search) {
    const safeSearch = search.slice(0, 100);
    const regex = new RegExp(escapeRegex(safeSearch), "i");

    const [result] = await Transaction.aggregate(
      [
        { $match: filter },
        {
          $lookup: {
            from: "categories",
            localField: "category",
            foreignField: "_id",
            as: "category",
          },
        },
        {
          $unwind: { path: "$category", preserveNullAndEmptyArrays: true },
        },
        {
          $match: { $or: [{ "category.name": regex }, { note: regex }] },
        },
        {
          $facet: {
            metadata: [{ $count: "total" }],
            data: [
              { $sort: sort },
              { $skip: skip },
              { $limit: limit },
              {
                $project: {
                  type: 1,
                  amount: 1,
                  note: 1,
                  date: 1,
                  paymentMethod: 1,
                  createdAt: 1,
                  category: { _id: 1, name: 1, type: 1 },
                },
              },
            ],
          },
        },
      ],
      { maxTimeMS: 10000 },
    );

    const total = result?.metadata?.[0]?.total ?? 0;
    const transactions = result?.data ?? [];

    return {
      transactions,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit) || 0,
        limit,
      },
    };
  }

  const [result] = await Transaction.aggregate(
    [
      { $match: filter },
      {
        $facet: {
          metadata: [{ $count: "total" }],
          data: [
            { $sort: sort },
            { $skip: skip },
            { $limit: limit },
            {
              $lookup: {
                from: "categories",
                localField: "category",
                foreignField: "_id",
                as: "category",
              },
            },
            {
              $unwind: {
                path: "$category",
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $project: {
                type: 1,
                amount: 1,
                note: 1,
                date: 1,
                paymentMethod: 1,
                createdAt: 1,
                sourceRecurringId: 1,
                category: { _id: 1, name: 1, type: 1 },
              },
            },
          ],
        },
      },
    ],
    { maxTimeMS: 10000 },
  );

  const total = result?.metadata?.[0]?.total ?? 0;
  const transactions = result?.data ?? [];

  return {
    transactions,
    pagination: {
      total,
      page,
      pages: Math.ceil(total / limit) || 0,
      limit,
    },
  };
};

// ─── UPDATE ───────────────────────────────────────────────────────────────────

export const updateTransactionService = async (userId, transactionId, body) => {
  const transaction = await Transaction.findOne({
    _id: transactionId,
    user: userId,
  });

  if (!transaction) {
    throw new ServiceError("Transaction not found", 404);
  }

  const { type, amount, category, note, date, paymentMethod } = body;

  if (type !== undefined) {
    if (!["income", "expense"].includes(type)) {
      throw new ServiceError("Invalid transaction type", 400);
    }
    transaction.type = type;
  }

  if (amount !== undefined) {
    const parsedAmount = Number(amount);
    if (
      !isFinite(parsedAmount) ||
      parsedAmount <= 0 ||
      parsedAmount > MAX_AMOUNT
    ) {
      throw new ServiceError("Invalid amount", 400);
    }
    transaction.amount = parsedAmount;
  }

  if (category !== undefined) {
    const categoryDoc = await Category.findOne({
      _id: category,
      user: userId,
    });
    if (!categoryDoc) {
      throw new ServiceError(
        "Category not found or does not belong to you",
        403,
      );
    }
    transaction.category = category;
  }

  if (note !== undefined) transaction.note = note;
  if (date !== undefined) transaction.date = date;
  if (paymentMethod !== undefined) transaction.paymentMethod = paymentMethod;

  return transaction.save();
};

// ─── DELETE ───────────────────────────────────────────────────────────────────

export const deleteTransactionService = async (userId, transactionId) => {
  const transaction = await Transaction.findOneAndDelete({
    _id: transactionId,
    user: userId,
  });

  if (!transaction) {
    throw new ServiceError("Transaction not found", 404);
  }

  return transaction;
};
