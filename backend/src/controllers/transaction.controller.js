import {
  createTransactionService,
  listTransactionsService,
  updateTransactionService,
  deleteTransactionService,
} from "../services/transaction.service.js";
import { ServiceError } from "../utils/ServiceError.js";

// @route   POST /api/transactions
export const createTransaction = async (req, res, next) => {
  try {
    const result = await createTransactionService(req.user._id, req.body);
    res.status(201).json(result);
  } catch (error) {
    if (error instanceof ServiceError) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    next(error);
  }
};

// @route   GET /api/transactions
export const getTransactions = async (req, res, next) => {
  try {
    const result = await listTransactionsService(req.user._id, req.query);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

// @route   PUT /api/transactions/:id
export const updateTransaction = async (req, res, next) => {
  try {
    const updated = await updateTransactionService(
      req.user._id,
      req.params.id,
      req.body,
    );
    res.status(200).json({ transaction: updated });
  } catch (error) {
    if (error instanceof ServiceError) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    next(error);
  }
};

// @route   DELETE /api/transactions/:id
export const deleteTransaction = async (req, res, next) => {
  try {
    await deleteTransactionService(req.user._id, req.params.id);
    res.status(200).json({ message: "Transaction deleted" });
  } catch (error) {
    if (error instanceof ServiceError) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    next(error);
  }
};
