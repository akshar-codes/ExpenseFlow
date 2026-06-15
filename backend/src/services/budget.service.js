import mongoose from "mongoose";
import Budget from "../models/Budget.js";
import Transaction from "../models/Transaction.js";
import Category from "../models/Category.js";
import { ServiceError } from "../utils/ServiceError.js";

const toObjectId = (value) => {
  if (!value) return null;
  if (value instanceof mongoose.Types.ObjectId) return value;
  if (mongoose.Types.ObjectId.isValid(String(value))) {
    return new mongoose.Types.ObjectId(String(value));
  }
  return null;
};

// ─── CREATE OR UPDATE BUDGET ──────────────────────────────────────────────────

export const setBudgetService = async (userId, body) => {
  const { category, limit, month, year } = body;

  if (!category || !limit || !month || !year) {
    throw new ServiceError("Required fields missing", 400);
  }

  const categoryId = toObjectId(category);
  if (!categoryId) {
    throw new ServiceError("category must be a valid Category ObjectId", 400);
  }

  const categoryDoc = await Category.findOne({
    _id: categoryId,
    user: userId,
  });

  if (!categoryDoc) {
    throw new ServiceError("Category not found or does not belong to you", 404);
  }

  if (categoryDoc.type !== "expense") {
    throw new ServiceError(
      "Budgets can only be set for expense categories",
      400,
    );
  }

  return Budget.findOneAndUpdate(
    {
      user: userId,
      category: categoryId,
      month: Number(month),
      year: Number(year),
    },
    { limit: Number(limit) },
    { new: true, upsert: true },
  ).populate("category", "name type");
};

// ─── GET BUDGET STATUS ────────────────────────────────────────────────────────

export const getBudgetStatusService = async (userId, query) => {
  const { month, year } = query;

  if (!month || !year) {
    throw new ServiceError("Month and year required", 400);
  }

  const numericMonth = Number(month);
  const numericYear = Number(year);

  const budgetDocs = await Budget.aggregate([
    {
      $match: { user: userId, month: numericMonth, year: numericYear },
    },
    {
      $lookup: {
        from: "categories",
        localField: "category",
        foreignField: "_id",
        as: "categoryDoc",
      },
    },
    {
      $unwind: {
        path: "$categoryDoc",
        preserveNullAndEmptyArrays: false, // auto-excludes orphaned budgets
      },
    },
    {
      $project: {
        _id: 1,
        category: "$categoryDoc._id",
        categoryName: "$categoryDoc.name",
        limit: 1,
        month: 1,
        year: 1,
      },
    },
  ]);

  if (budgetDocs.length === 0) return [];

  const startDate = new Date(Date.UTC(numericYear, numericMonth - 1, 1));
  const endDate = new Date(
    Date.UTC(numericYear, numericMonth, 0, 23, 59, 59, 999),
  );

  const categoryIds = budgetDocs.map((b) => b.category);

  const expenses = await Transaction.aggregate(
    [
      {
        $match: {
          user: userId,
          type: "expense",
          category: { $in: categoryIds },
          date: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: "$category",
          spent: { $sum: "$amount" },
        },
      },
    ],
    { maxTimeMS: 10000 },
  );

  const spentMap = {};
  expenses.forEach((e) => {
    spentMap[e._id.toString()] = e.spent;
  });

  return budgetDocs.map((budget) => {
    const categoryKey = budget.category.toString();
    const spent = spentMap[categoryKey] ?? 0;

    const spentCents = Math.round(spent * 100);
    const limitCents = Math.round(budget.limit * 100);
    const remainingCents = limitCents - spentCents;
    const percentage = Number(((spentCents / limitCents) * 100).toFixed(2));

    return {
      _id: budget._id,
      category: budget.category,
      categoryName: budget.categoryName,
      limit: budget.limit,
      spent: Math.round(spent * 100) / 100,
      remaining: Math.round(remainingCents) / 100,
      percentage,
      warning: percentage >= 80,
      exceeded: spentCents > limitCents,
      month: budget.month,
      year: budget.year,
    };
  });
};

// ─── DELETE BUDGET ────────────────────────────────────────────────────────────

export const deleteBudgetService = async (userId, budgetId) => {
  const budget = await Budget.findOneAndDelete({ _id: budgetId, user: userId });

  if (!budget) {
    throw new ServiceError("Budget not found", 404);
  }

  return budget;
};

// ─── GET ALL BUDGETS ──────────────────────────────────────────────────────────

export const getBudgetsService = async (userId, query) => {
  const { month, year } = query;
  const filter = { user: userId };

  if (month) filter.month = Number(month);
  if (year) filter.year = Number(year);

  return Budget.aggregate(
    [
      { $match: filter },
      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "categoryDoc",
        },
      },
      {
        $unwind: {
          path: "$categoryDoc",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          limit: 1,
          month: 1,
          year: 1,
          createdAt: 1,
          category: {
            _id: "$categoryDoc._id",
            name: "$categoryDoc.name",
            type: "$categoryDoc.type",
          },
        },
      },
      { $sort: { year: -1, month: -1 } },
    ],
    { maxTimeMS: 10000 },
  );
};
