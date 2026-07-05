import express from "express";
import { protect } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { getInsightsSchema } from "../validators/aiInsights.validator.js";
import {
  getInsights,
  clearInsightsCache,
  providerHealth,
} from "../controllers/aiInsights.controller.js";

const router = express.Router();

router.use(protect);

// Generate (or return cached) AI insights for the current user
router.get("/", validate(getInsightsSchema, "query"), getInsights);

// Invalidate cached insights
router.delete("/cache", clearInsightsCache);

// AI provider health check
router.get("/health", providerHealth);

export default router;
