import mongoose from "mongoose";
import crypto from "crypto";

// ─── Supported email notification types ──────────────────────────────────────

export const EMAIL_TYPES = Object.freeze({
  WELCOME: "welcome",
  WEEKLY_SUMMARY: "weeklySummary",
  MONTHLY_SUMMARY: "monthlySummary",
  BUDGET_WARNING: "budgetWarning",
  GOAL_COMPLETED: "goalCompleted",
  GOAL_REMINDER: "goalReminder",
  RECURRING_REMINDER: "recurringReminder",
});

export const CONFIGURABLE_EMAIL_TYPES = Object.freeze(
  Object.values(EMAIL_TYPES).filter((t) => t !== EMAIL_TYPES.WELCOME),
);

export const SUMMARY_FREQUENCY = Object.freeze({
  WEEKLY: "weekly",
  MONTHLY: "monthly",
  BOTH: "both",
  NONE: "none",
});

const notificationPreferenceSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },

    emailEnabled: {
      type: Boolean,
      default: true,
    },

    summaryFrequency: {
      type: String,
      enum: Object.values(SUMMARY_FREQUENCY),
      default: SUMMARY_FREQUENCY.WEEKLY,
    },

    // Per-type opt-in/opt-out. Defaults to all enabled.
    emailTypes: {
      weeklySummary: { type: Boolean, default: true },
      monthlySummary: { type: Boolean, default: true },
      budgetWarning: { type: Boolean, default: true },
      goalCompleted: { type: Boolean, default: true },
      goalReminder: { type: Boolean, default: true },
      recurringReminder: { type: Boolean, default: true },
    },

    goalReminderLeadDays: {
      type: Number,
      default: 7,
      min: 1,
      max: 30,
    },
    recurringReminderLeadDays: {
      type: Number,
      default: 1,
      min: 0,
      max: 7,
    },

    // One-click unsubscribe token embedded in every email footer.
    unsubscribeToken: {
      type: String,
      default: () => crypto.randomBytes(24).toString("hex"),
      unique: true,
      index: true,
    },
  },
  { timestamps: true },
);

export default mongoose.model(
  "NotificationPreference",
  notificationPreferenceSchema,
);
