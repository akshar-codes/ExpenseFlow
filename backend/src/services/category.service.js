import mongoose from "mongoose";
import Category from "../models/Category.js";
import Budget from "../models/Budget.js";
import RecurringTransaction from "../models/RecurringTransaction.js";

const VALID_TYPES = ["income", "expense"];
const MIN_NAME_LENGTH = 2;
const MAX_NAME_LENGTH = 50;

export { ServiceError } from "../utils/ServiceError.js";

// ─── LIST ─────────────────────────────────────────────────────────────────────

export const listCategoriesService = async (userId) => {
  return Category.find({ user: userId }).sort({ type: 1, name: 1 });
};

// ─── CREATE ───────────────────────────────────────────────────────────────────

export const createCategoryService = async (userId, { name, type } = {}) => {
  if (!type || !VALID_TYPES.includes(type)) {
    throw new ServiceError(
      `type must be one of: ${VALID_TYPES.join(", ")}`,
      400,
    );
  }

  if (typeof name !== "string") {
    throw new ServiceError("name must be a string", 400);
  }

  const trimmedName = name.trim();

  if (trimmedName.length === 0) {
    throw new ServiceError("name must not be empty", 400);
  }
  if (trimmedName.length < MIN_NAME_LENGTH) {
    throw new ServiceError(
      `name must be at least ${MIN_NAME_LENGTH} characters`,
      400,
    );
  }
  if (trimmedName.length > MAX_NAME_LENGTH) {
    throw new ServiceError(
      `name must not exceed ${MAX_NAME_LENGTH} characters`,
      400,
    );
  }

  try {
    return await Category.create({ name: trimmedName, type, user: userId });
  } catch (err) {
    if (err.code === 11000) {
      throw new ServiceError(
        `A ${type} category named "${trimmedName}" already exists`,
        409,
      );
    }
    throw err;
  }
};

// ─── DELETE (cascade) ───────────────────────────────────────────────────────────

export const deleteCategoryService = async (userId, categoryId) => {
  const category = await Category.findOne({ _id: categoryId, user: userId });

  if (!category) {
    throw new ServiceError("Category not found", 404);
  }

  let budgetsDeleted = 0;
  let recurringDeactivated = 0;

  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      await Category.findByIdAndDelete(category._id, { session });

      const budgetResult = await Budget.deleteMany(
        { category: category._id, user: userId },
        { session },
      );
      budgetsDeleted = budgetResult.deletedCount;

      const recurringResult = await RecurringTransaction.updateMany(
        { category: category._id, user: userId, isActive: true },
        { $set: { isActive: false } },
        { session },
      );
      recurringDeactivated = recurringResult.modifiedCount;
    });
  } catch (err) {
    // Replica-set transactions not available — fall back to sequential writes.
    if (
      err.codeName === "CommandNotSupportedOnStandalone" ||
      err.message?.includes("Transaction numbers") ||
      err.message?.includes("standalone")
    ) {
      await Category.findByIdAndDelete(category._id);

      const budgetResult = await Budget.deleteMany({
        category: category._id,
        user: userId,
      });
      budgetsDeleted = budgetResult.deletedCount;

      const recurringResult = await RecurringTransaction.updateMany(
        { category: category._id, user: userId, isActive: true },
        { $set: { isActive: false } },
      );
      recurringDeactivated = recurringResult.modifiedCount;
    } else {
      throw err;
    }
  } finally {
    session.endSession();
  }

  return { budgetsDeleted, recurringDeactivated };
};
