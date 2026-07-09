import express from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";

import { protect } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  previewImportSchema,
  commitImportSchema,
} from "../validators/import.validator.js";
import {
  previewImport,
  commitImport,
  listImportBatches,
  getImportBatch,
  rollbackImport,
} from "../controllers/import.controller.js";

const router = express.Router();

const importLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?._id?.toString() || ipKeyGenerator(req),
  message: {
    success: false,
    message: "Too many import requests. Please slow down.",
  },
});

router.use(protect);
router.use(importLimiter);

router.post("/preview", validate(previewImportSchema), previewImport);
router.post("/commit", validate(commitImportSchema), commitImport);
router.get("/", listImportBatches);
router.get("/:id", getImportBatch);
router.delete("/:id", rollbackImport);

export default router;
