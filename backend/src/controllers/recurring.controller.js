import RecurringTransaction from "../models/RecurringTransaction.js";
import Transaction from "../models/Transaction.js";

// ─── GET all recurring transactions for logged-in user ────────────────────────
// @route  GET /api/recurring
// @access Private
export const getRecurringTransactions = async (req, res, next) => {
  try {
    const transactions = await RecurringTransaction.find({ user: req.user._id })
      .populate("category", "name type")
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json(transactions);
  } catch (error) {
    next(error);
  }
};

// ─── CREATE a recurring transaction ───────────────────────────────────────────
// @route  POST /api/recurring
// @access Private
export const createRecurringTransaction = async (req, res, next) => {
  try {
    const {
      title,
      type,
      amount,
      category,
      frequency,
      startDate,
      endDate,
      note,
    } = req.body;

    if (!title || !type || !amount || !category || !frequency || !startDate) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    const transaction = await RecurringTransaction.create({
      user: req.user._id,
      title,
      type,
      amount,
      category,
      frequency,
      startDate,
      endDate: endDate || null,
      note: note || "",
      active: true,
      nextDate: startDate,
    });

    const populated = await transaction.populate("category", "name type");
    res.status(201).json(populated);
  } catch (error) {
    next(error);
  }
};

// ─── UPDATE a recurring transaction ───────────────────────────────────────────
// @route  PUT /api/recurring/:id
// @access Private
export const updateRecurringTransaction = async (req, res, next) => {
  try {
    const transaction = await RecurringTransaction.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { $set: req.body },
      // ✅ returnDocument replaces deprecated { new: true }
      { returnDocument: "after", runValidators: true },
    ).populate("category", "name type");

    if (!transaction) {
      return res
        .status(404)
        .json({ message: "Recurring transaction not found" });
    }

    res.status(200).json(transaction);
  } catch (error) {
    next(error);
  }
};

// ─── DELETE a recurring transaction ───────────────────────────────────────────
// @route  DELETE /api/recurring/:id
// @access Private
export const deleteRecurringTransaction = async (req, res, next) => {
  try {
    const transaction = await RecurringTransaction.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!transaction) {
      return res
        .status(404)
        .json({ message: "Recurring transaction not found" });
    }

    res.status(200).json({ message: "Recurring transaction deleted" });
  } catch (error) {
    next(error);
  }
};
