import {
  previewImportService,
  commitImportService,
  listImportBatchesService,
  getImportBatchService,
  rollbackImportService,
} from "../services/import/import.service.js";
import { ServiceError } from "../utils/ServiceError.js";

const handleError = (err, res, next) => {
  if (err instanceof ServiceError) {
    return res.status(err.statusCode).json({ message: err.message });
  }
  next(err);
};

// @route   POST /api/import/preview
// @access  Private
export const previewImport = async (req, res, next) => {
  try {
    const result = await previewImportService(req.user._id, req.body);
    res.status(200).json(result);
  } catch (err) {
    handleError(err, res, next);
  }
};

// @route   POST /api/import/commit
// @access  Private
export const commitImport = async (req, res, next) => {
  try {
    const result = await commitImportService(req.user._id, req.body);
    res.status(201).json(result);
  } catch (err) {
    handleError(err, res, next);
  }
};

// @route   GET /api/import
// @access  Private
export const listImportBatches = async (req, res, next) => {
  try {
    const batches = await listImportBatchesService(req.user._id);
    res.status(200).json(batches);
  } catch (err) {
    handleError(err, res, next);
  }
};

// @route   GET /api/import/:id
// @access  Private
export const getImportBatch = async (req, res, next) => {
  try {
    const batch = await getImportBatchService(req.user._id, req.params.id);
    res.status(200).json(batch);
  } catch (err) {
    handleError(err, res, next);
  }
};

// @route   DELETE /api/import/:id
// @access  Private
export const rollbackImport = async (req, res, next) => {
  try {
    const result = await rollbackImportService(req.user._id, req.params.id);
    res.status(200).json(result);
  } catch (err) {
    handleError(err, res, next);
  }
};
