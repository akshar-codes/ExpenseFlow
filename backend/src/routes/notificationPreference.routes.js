import express from "express";
import { protect } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  updatePreferencesSchema,
  unsubscribeSchema,
} from "../validators/notificationPreference.validator.js";
import {
  getPreferences,
  putPreferences,
  unsubscribe,
} from "../controllers/notificationPreference.controller.js";

const router = express.Router();

// Public one-click unsubscribe — must stay unauthenticated since it's
// reached directly from an email link, not from within the logged-in app.
router.get("/unsubscribe", validate(unsubscribeSchema, "query"), unsubscribe);

router.use(protect);

router.get("/preferences", getPreferences);
router.put("/preferences", validate(updatePreferencesSchema), putPreferences);

export default router;
