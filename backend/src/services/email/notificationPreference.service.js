import NotificationPreference, {
  CONFIGURABLE_EMAIL_TYPES,
  SUMMARY_FREQUENCY,
} from "../../models/NotificationPreference.js";
import { ServiceError } from "../../utils/ServiceError.js";

/**
 * Fetch a user's notification preferences, creating a default document on
 * first access so every downstream check can assume one always exists.
 */
export const getOrCreatePreferences = async (userId) => {
  let prefs = await NotificationPreference.findOne({ user: userId });
  if (!prefs) {
    prefs = await NotificationPreference.create({ user: userId });
  }
  return prefs;
};

const ALLOWED_UPDATE_FIELDS = [
  "emailEnabled",
  "summaryFrequency",
  "goalReminderLeadDays",
  "recurringReminderLeadDays",
];

export const updatePreferences = async (userId, body = {}) => {
  const prefs = await getOrCreatePreferences(userId);

  ALLOWED_UPDATE_FIELDS.forEach((field) => {
    if (body[field] !== undefined) prefs[field] = body[field];
  });

  if (body.emailTypes && typeof body.emailTypes === "object") {
    CONFIGURABLE_EMAIL_TYPES.forEach((type) => {
      if (body.emailTypes[type] !== undefined) {
        prefs.emailTypes[type] = Boolean(body.emailTypes[type]);
      }
    });
  }

  await prefs.save();
  return prefs;
};

/**
 * Central gate used by every email-triggering code path. Returns true only
 */
export const isEmailTypeEnabled = async (userId, type) => {
  if (type === "welcome") return true;

  const prefs = await getOrCreatePreferences(userId);
  if (!prefs.emailEnabled) return false;

  if (type === "weeklySummary" || type === "monthlySummary") {
    const freq = prefs.summaryFrequency;
    const summaryAllowsFrequency =
      freq === SUMMARY_FREQUENCY.BOTH ||
      (type === "weeklySummary" && freq === SUMMARY_FREQUENCY.WEEKLY) ||
      (type === "monthlySummary" && freq === SUMMARY_FREQUENCY.MONTHLY);

    if (!summaryAllowsFrequency) return false;
  }

  return Boolean(prefs.emailTypes?.[type]);
};

export const unsubscribeByToken = async (token) => {
  const prefs = await NotificationPreference.findOne({
    unsubscribeToken: token,
  });
  if (!prefs) {
    throw new ServiceError("Invalid or expired unsubscribe link", 404);
  }
  prefs.emailEnabled = false;
  await prefs.save();
  return prefs;
};
