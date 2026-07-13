import mongoose from "mongoose";
import { EMAIL_TYPES } from "./NotificationPreference.js";

export const EMAIL_STATUS = Object.freeze({
  PENDING: "pending",
  PROCESSING: "processing",
  SENT: "sent",
  FAILED: "failed",
});

const MAX_ATTEMPTS = 5;

const emailQueueSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: Object.values(EMAIL_TYPES),
      required: true,
    },

    // Arbitrary JSON payload consumed by the matching template builder
    // (e.g. { month, year, income, expense } for monthlySummary).
    payload: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // Resolved at enqueue time so the worker never needs a live User lookup
    // just to know where to send.
    recipientEmail: {
      type: String,
      required: true,
    },

    status: {
      type: String,
      enum: Object.values(EMAIL_STATUS),
      default: EMAIL_STATUS.PENDING,
    },

    // Emails are never sent before this timestamp — supports both immediate
    // sends (now) and scheduled digests (e.g. next Monday 08:00 UTC).
    scheduledFor: {
      type: Date,
      default: Date.now,
      index: true,
    },

    attempts: {
      type: Number,
      default: 0,
    },

    maxAttempts: {
      type: Number,
      default: MAX_ATTEMPTS,
    },

    lastError: {
      type: String,
      default: null,
    },

    sentAt: {
      type: Date,
      default: null,
    },

    // Dedup key: prevents the same digest/reminder/alert being queued twice
    // for the same user in the same period (e.g. "weeklySummary:2026-W28").
    dedupeKey: {
      type: String,
      default: null,
    },
  },
  { timestamps: true },
);

// Primary worker query: due, pending emails, oldest first.
emailQueueSchema.index({ status: 1, scheduledFor: 1 });

// Prevent duplicate scheduled digests/reminders/alerts per user per period.
emailQueueSchema.index(
  { user: 1, dedupeKey: 1 },
  {
    unique: true,
    partialFilterExpression: { dedupeKey: { $type: "string" } },
    name: "email_queue_user_dedupe_unique",
  },
);

export default mongoose.model("EmailQueue", emailQueueSchema);
