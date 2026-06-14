import mongoose from "mongoose";
import Category from "../models/Category.js";
import Budget from "../models/Budget.js";
import RecurringTransaction from "../models/RecurringTransaction.js";

const VALID_TYPES = ["income", "expense"];
const MIN_NAME_LENGTH = 2;
const MAX_NAME_LENGTH = 50;

// ─── GET /api/categories ──────────────────────────────────────────────────────

export const getCategories = async (req, res) => {
  try {
    const categories = await Category.find({ user: req.user._id }).sort({
      type: 1,
      name: 1,
    });
    res.json(categories);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── POST /api/categories ─────────────────────────────────────────────────────

export const addCategory = async (req, res) => {
  let trimmedName;
  let type;

  try {
    type = req.body.type;
    const rawName = req.body.name;

    // ── Type validation ───────────────────────────────────────────────────
    if (!type || !VALID_TYPES.includes(type)) {
      return res.status(400).json({
        message: `type must be one of: ${VALID_TYPES.join(", ")}`,
      });
    }

    // ── Name validation ───────────────────────────────────────────────────
    if (typeof rawName !== "string") {
      return res.status(400).json({ message: "name must be a string" });
    }

    trimmedName = rawName.trim();

    if (trimmedName.length === 0) {
      return res.status(400).json({ message: "name must not be empty" });
    }

    if (trimmedName.length < MIN_NAME_LENGTH) {
      return res.status(400).json({
        message: `name must be at least ${MIN_NAME_LENGTH} characters`,
      });
    }

    if (trimmedName.length > MAX_NAME_LENGTH) {
      return res.status(400).json({
        message: `name must not exceed ${MAX_NAME_LENGTH} characters`,
      });
    }

    const category = await Category.create({
      name: trimmedName,
      type,
      user: req.user._id,
    });

    res.status(201).json(category);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        message: `A ${type} category named "${trimmedName}" already exists`,
      });
    }
    res.status(500).json({ message: err.message });
  }
};

// ─── DELETE /api/categories/:id ───────────────────────────────────────────────

export const deleteCategory = async (req, res) => {
  // First verify ownership outside the transaction — cheap read, no write.
  const category = await Category.findOne({
    _id: req.params.id,
    user: req.user._id,
  });

  if (!category) {
    return res.status(404).json({ message: "Category not found" });
  }

  let budgetsDeleted = 0;
  let recurringDeactivated = 0;

  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      // 1. Delete the category itself.
      await Category.findByIdAndDelete(category._id, { session });

      // 2. Cascade: remove orphaned budgets.
      const budgetResult = await Budget.deleteMany(
        { category: category._id, user: req.user._id },
        { session },
      );
      budgetsDeleted = budgetResult.deletedCount;

      // 3. Cascade: deactivate orphaned recurring transactions.
      const recurringResult = await RecurringTransaction.updateMany(
        { category: category._id, user: req.user._id, isActive: true },
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
      // Re-delete (idempotent findOneAndDelete on primary key).
      await Category.findByIdAndDelete(category._id);

      const budgetResult = await Budget.deleteMany({
        category: category._id,
        user: req.user._id,
      });
      budgetsDeleted = budgetResult.deletedCount;

      const recurringResult = await RecurringTransaction.updateMany(
        { category: category._id, user: req.user._id, isActive: true },
        { $set: { isActive: false } },
      );
      recurringDeactivated = recurringResult.modifiedCount;
    } else {
      return res.status(500).json({ message: err.message });
    }
  } finally {
    session.endSession();
  }

  res.json({
    message: "Category deleted",
    cascade: { budgetsDeleted, recurringDeactivated },
  });
};
