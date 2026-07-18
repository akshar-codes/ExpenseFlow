import express from "express";
import { protect } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  subscribeSchema,
  unsubscribeSchema,
} from "../validators/push.validator.js";
import {
  getVapidPublicKey,
  subscribe,
  unsubscribe,
} from "../controllers/push.controller.js";

const router = express.Router();

router.use(protect);

router.get("/vapid-public-key", getVapidPublicKey);
router.post("/subscribe", validate(subscribeSchema), subscribe);
router.delete("/subscribe", validate(unsubscribeSchema), unsubscribe);

export default router;
