import express from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";

import { protect } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { handleReceiptUpload } from "../middlewares/upload.middleware.js";
import {
  listReceiptsSchema,
  updateExtractedFieldsSchema,
  confirmReceiptSchema,
} from "../validators/receipt.validator.js";
import {
  scanReceipt,
  listReceipts,
  getReceipt,
  getReceiptImage,
  updateExtractedFields,
  confirmReceipt,
  deleteReceipt,
  ocrHealthCheck,
} from "../controllers/receipt.controller.js";

const router = express.Router();

// OCR is CPU-intensive — a tighter per-user limit, mirroring the
// aiInsightsLimiter / report generateLimiter pattern used elsewhere.
const scanLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?._id?.toString() || ipKeyGenerator(req),
  message: {
    success: false,
    message: "Too many receipt scans. Please try again later.",
  },
});

router.use(protect);

router.post("/scan", scanLimiter, handleReceiptUpload, scanReceipt);
router.get("/ocr-health", ocrHealthCheck);
router.get("/", validate(listReceiptsSchema, "query"), listReceipts);
router.get("/:id", getReceipt);
router.get("/:id/image", getReceiptImage);
router.put("/:id", validate(updateExtractedFieldsSchema), updateExtractedFields);
router.post("/:id/confirm", validate(confirmReceiptSchema), confirmReceipt);
router.delete("/:id", deleteReceipt);

export default router;
