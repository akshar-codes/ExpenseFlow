import {
  listCategoriesService,
  createCategoryService,
  deleteCategoryService,
  ServiceError,
} from "../services/category.service.js";

// ─── GET /api/categories ──────────────────────────────────────────────────────

export const getCategories = async (req, res, next) => {
  try {
    const categories = await listCategoriesService(req.user._id);
    res.json(categories);
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/categories ─────────────────────────────────────────────────────

export const addCategory = async (req, res, next) => {
  try {
    const category = await createCategoryService(req.user._id, req.body);
    res.status(201).json(category);
  } catch (err) {
    if (err instanceof ServiceError) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    next(err);
  }
};

// ─── DELETE /api/categories/:id ───────────────────────────────────────────────

export const deleteCategory = async (req, res, next) => {
  try {
    const cascade = await deleteCategoryService(req.user._id, req.params.id);
    res.json({ message: "Category deleted", cascade });
  } catch (err) {
    if (err instanceof ServiceError) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    next(err);
  }
};
