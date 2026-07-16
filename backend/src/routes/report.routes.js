import express from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { protect } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  generateReportSchema,
  emailReportSchema,
  listReportsSchema,
} from "../validators/report.validator.js";
import {
  generateReport,
  listReports,
  getReport,
  downloadReport,
  emailReport,
  deleteReport,
} from "../controllers/report.controller.js";

const router = express.Router();

// PDF generation is CPU-intensive — a tighter per-user limit than the
// general API rate limiter (mirrors the aiInsightsLimiter pattern in app.js).
const generateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?._id?.toString() || ipKeyGenerator(req),
  message: {
    success: false,
    message: "Too many report generation requests. Please try again later.",
  },
});

router.use(protect);

router.post(
  "/generate",
  generateLimiter,
  validate(generateReportSchema),
  generateReport,
);
router.get("/", validate(listReportsSchema, "query"), listReports);
router.get("/:id", getReport);
router.get("/:id/download", downloadReport);
router.post("/:id/email", validate(emailReportSchema), emailReport);
router.delete("/:id", deleteReport);

export default router;
