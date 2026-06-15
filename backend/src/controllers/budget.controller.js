import {
  setBudgetService,
  getBudgetStatusService,
  getBudgetsService,
  deleteBudgetService,
} from "../services/budget.service.js";
import { ServiceError } from "../utils/ServiceError.js";

// @route   POST /api/budgets
export const setBudget = async (req, res, next) => {
  try {
    const budget = await setBudgetService(req.user._id, req.body);
    res.status(200).json(budget);
  } catch (error) {
    if (error instanceof ServiceError) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    next(error);
  }
};

// @route   GET /api/budgets/status
export const getBudgetStatus = async (req, res, next) => {
  try {
    const result = await getBudgetStatusService(req.user._id, req.query);
    res.status(200).json(result);
  } catch (error) {
    if (error instanceof ServiceError) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    next(error);
  }
};

// @route   DELETE /api/budgets/:id
export const deleteBudget = async (req, res, next) => {
  try {
    await deleteBudgetService(req.user._id, req.params.id);
    res.status(200).json({ message: "Budget deleted successfully" });
  } catch (error) {
    if (error instanceof ServiceError) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    next(error);
  }
};

// @route   GET /api/budgets
export const getBudgets = async (req, res, next) => {
  try {
    const budgets = await getBudgetsService(req.user._id, req.query);
    res.status(200).json(budgets);
  } catch (error) {
    next(error);
  }
};
