import {
  getOrCreatePreferences,
  updatePreferences,
  unsubscribeByToken,
} from "../services/email/notificationPreference.service.js";
import { ServiceError } from "../utils/ServiceError.js";

// @route   GET /api/notifications/preferences
export const getPreferences = async (req, res, next) => {
  try {
    const prefs = await getOrCreatePreferences(req.user._id);
    res.status(200).json(prefs);
  } catch (error) {
    next(error);
  }
};

// @route   PUT /api/notifications/preferences
export const putPreferences = async (req, res, next) => {
  try {
    const prefs = await updatePreferences(req.user._id, req.body);
    res.status(200).json(prefs);
  } catch (error) {
    if (error instanceof ServiceError) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    next(error);
  }
};

// @route   GET /api/notifications/unsubscribe?token=...
// Public — reached via the unsubscribe link embedded in email footers, so it
// must stay unauthenticated (the recipient isn't necessarily logged in).
export const unsubscribe = async (req, res, next) => {
  try {
    await unsubscribeByToken(req.query.token);
    res
      .status(200)
      .json({ message: "You have been unsubscribed from all emails." });
  } catch (error) {
    if (error instanceof ServiceError) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    next(error);
  }
};
