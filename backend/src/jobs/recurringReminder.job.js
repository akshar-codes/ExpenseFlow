import cron from "node-cron";
import RecurringTransaction from "../models/RecurringTransaction.js";
import { enqueueEmail } from "../services/email/emailQueue.service.js";
import { getOrCreatePreferences } from "../services/email/notificationPreference.service.js";
import { EMAIL_TYPES } from "../models/NotificationPreference.js";
import { acquireJobLock, releaseJobLock } from "../utils/jobLock.js";
import logger from "../config/logger.js";

const LOCK_NAME = "recurring_reminder_email";
const LOCK_TTL_MS = 9 * 60 * 1000;

const computeNextDate = (item) => {
  const base = new Date(item.lastExecuted ?? item.startDate);
  const d = new Date(
    Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate()),
  );
  switch (item.frequency) {
    case "daily":
      d.setUTCDate(d.getUTCDate() + 1);
      break;
    case "weekly":
      d.setUTCDate(d.getUTCDate() + 7);
      break;
    case "monthly":
      d.setUTCMonth(d.getUTCMonth() + 1);
      break;
    case "yearly":
      d.setUTCFullYear(d.getUTCFullYear() + 1);
      break;
  }
  return d;
};

const runJob = async () => {
  const acquired = await acquireJobLock(LOCK_NAME, LOCK_TTL_MS);
  if (!acquired) return;

  try {
    const now = new Date();
    const todayKey = now.toISOString().slice(0, 10);

    const items = await RecurringTransaction.find({ isActive: true })
      .select("user title type amount frequency startDate lastExecuted endDate")
      .lean();

    let queued = 0;

    for (const item of items) {
      if (item.endDate && new Date(item.endDate) < now) continue;

      const nextDate = computeNextDate(item);
      const daysUntil = Math.ceil((nextDate - now) / (1000 * 60 * 60 * 24));

      const prefs = await getOrCreatePreferences(item.user);
      if (daysUntil < 0 || daysUntil > prefs.recurringReminderLeadDays) {
        continue;
      }

      const result = await enqueueEmail({
        userId: item.user,
        type: EMAIL_TYPES.RECURRING_REMINDER,
        payload: {
          title: item.title || "Recurring transaction",
          type: item.type,
          amount: item.amount,
          frequency: item.frequency,
          nextDate: nextDate.toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
            timeZone: "UTC",
          }),
        },
        // One reminder per recurring item per day.
        dedupeKey: `recurringReminder:${item._id}:${todayKey}`,
      });

      if (result) queued++;
    }

    logger.info({ queued }, "recurringReminder: job complete");
  } catch (err) {
    logger.error({ err: err.message }, "recurringReminder: fatal error");
  } finally {
    await releaseJobLock(LOCK_NAME);
  }
};

export const startRecurringReminderJob = () => {
  // Daily at 07:00 UTC — ahead of the midnight recurring-posting job so
  // users see the reminder before the transaction actually posts.
  cron.schedule("0 7 * * *", runJob);
  logger.info("[recurring-reminder] Scheduled daily at 07:00 UTC.");
};

export const runRecurringReminderJobOnce = runJob;
