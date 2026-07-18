import {
  subscribeService,
  unsubscribeService,
} from "../services/push/push.service.js";
import { isPushConfigured } from "../services/push/webPush.config.js";
import { ServiceError } from "../utils/ServiceError.js";

const handleError = (err, res, next) => {
  if (err instanceof ServiceError) {
    return res.status(err.statusCode).json({ message: err.message });
  }
  next(err);
};

// @route   GET /api/push/vapid-public-key
export const getVapidPublicKey = async (req, res) => {
  res.status(200).json({
    configured: isPushConfigured(),
    publicKey: isPushConfigured() ? process.env.VAPID_PUBLIC_KEY : null,
  });
};

// @route   POST /api/push/subscribe
export const subscribe = async (req, res, next) => {
  try {
    const subscription = await subscribeService(
      req.user._id,
      req.body,
      req.headers["user-agent"] || "",
    );
    res.status(201).json({
      message: "Subscribed to push notifications",
      subscription: { endpoint: subscription.endpoint },
    });
  } catch (err) {
    handleError(err, res, next);
  }
};

// @route   DELETE /api/push/subscribe
export const unsubscribe = async (req, res, next) => {
  try {
    await unsubscribeService(req.user._id, req.body.endpoint);
    res.status(200).json({ message: "Unsubscribed from push notifications" });
  } catch (err) {
    handleError(err, res, next);
  }
};
