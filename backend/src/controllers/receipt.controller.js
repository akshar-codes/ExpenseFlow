import {
  scanReceiptService,
  listReceiptsService,
  getReceiptService,
  getReceiptImageService,
  updateExtractedFieldsService,
  confirmReceiptService,
  deleteReceiptService,
} from "../services/receipt.service.js";
import { getOCRProvider } from "../services/ocr/OCRProviderFactory.js";
import { ServiceError } from "../utils/ServiceError.js";

const handleError = (err, res, next) => {
  if (err instanceof ServiceError) {
    return res.status(err.statusCode).json({ message: err.message });
  }
  next(err);
};

// @route   POST /api/receipts/scan
// @access  Private
export const scanReceipt = async (req, res, next) => {
  try {
    const receipt = await scanReceiptService(req.user._id, req.file);
    res.status(201).json(receipt);
  } catch (err) {
    handleError(err, res, next);
  }
};

// @route   GET /api/receipts
// @access  Private
export const listReceipts = async (req, res, next) => {
  try {
    const result = await listReceiptsService(req.user._id, req.query);
    res.status(200).json(result);
  } catch (err) {
    handleError(err, res, next);
  }
};

// @route   GET /api/receipts/:id
// @access  Private
export const getReceipt = async (req, res, next) => {
  try {
    const receipt = await getReceiptService(req.user._id, req.params.id);
    res.status(200).json(receipt);
  } catch (err) {
    handleError(err, res, next);
  }
};

// @route   GET /api/receipts/:id/image
// @access  Private
export const getReceiptImage = async (req, res, next) => {
  try {
    const { buffer, mimeType } = await getReceiptImageService(
      req.user._id,
      req.params.id,
    );
    res.setHeader("Content-Type", mimeType);
    res.send(buffer);
  } catch (err) {
    handleError(err, res, next);
  }
};

// @route   PUT /api/receipts/:id
// @access  Private
export const updateExtractedFields = async (req, res, next) => {
  try {
    const receipt = await updateExtractedFieldsService(
      req.user._id,
      req.params.id,
      req.body,
    );
    res.status(200).json(receipt);
  } catch (err) {
    handleError(err, res, next);
  }
};

// @route   POST /api/receipts/:id/confirm
// @access  Private
export const confirmReceipt = async (req, res, next) => {
  try {
    const result = await confirmReceiptService(
      req.user._id,
      req.params.id,
      req.body,
    );
    res.status(200).json(result);
  } catch (err) {
    handleError(err, res, next);
  }
};

// @route   DELETE /api/receipts/:id
// @access  Private
export const deleteReceipt = async (req, res, next) => {
  try {
    await deleteReceiptService(req.user._id, req.params.id);
    res.status(200).json({ message: "Receipt deleted" });
  } catch (err) {
    handleError(err, res, next);
  }
};

// @route   GET /api/receipts/ocr-health
// @access  Private
export const ocrHealthCheck = async (req, res, next) => {
  try {
    const provider = getOCRProvider();
    const result = await provider.healthCheck();
    res.status(result.ok ? 200 : 503).json(result);
  } catch (err) {
    next(err);
  }
};
