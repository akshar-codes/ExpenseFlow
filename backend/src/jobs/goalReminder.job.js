import cron from "node-cron";
import { Goal } from "../models/Goal.js";
import { enqueueEmail } from "../services/email/emailQueue.service.js";
import { getOrCreatePreferences } from "../services/email/notificationPreference.service.js";
import { EMAIL_TYPES } from "../models/NotificationPreference.js";
import { acquireJobLock, releaseJobLock } from "../utils/jobLock.js";
import logger from "../config/logger.js";

const LOCK_NAME = "goal_reminder_email";
const LOCK_TTL_MS = 9 * 60 * 1000;

const runJob = async () => {
  const acquired = await acquireJobLock(LOCK_NAME, LOCK_TTL_MS);
  if (!acquired) return;

  try {
    const now = new Date();
    const todayKey = now.toISOString().slice(0, 10);

    // Widest possible lead window (max 30 days per NotificationPreference
    // schema) — narrowed per-user below via the user's actual preference.
    const outerWindowEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const candidates = await Goal.find({
      status: "active",
      targetDate: { $gte: now, $lte: outerWindowEnd },
    })
      .select("user title targetAmount currentAmount targetDate")
      .lean();

    let queued = 0;

    for (const goal of candidates) {
      const prefs = await getOrCreatePreferences(goal.user);
      const daysRemaining = Math.ceil(
        (new Date(goal.targetDate) - now) / (1000 * 60 * 60 * 24),
      );

      if (daysRemaining > prefs.goalReminderLeadDays || daysRemaining < 0) {
        continue;
      }

      const progressPercentage =
        goal.targetAmount > 0
          ? Math.min(
              Math.round((goal.currentAmount / goal.targetAmount) * 10000) /
                100,
              100,
            )
          : 0;

      const result = await enqueueEmail({
        userId: goal.user,
        type: EMAIL_TYPES.GOAL_REMINDER,
        payload: {
          goalTitle: goal.title,
          targetAmount: goal.targetAmount,
          currentAmount: goal.currentAmount,
          progressPercentage,
          daysRemaining,
        },
        // One reminder per goal per day, even if the job runs more than once.
        dedupeKey: `goalReminder:${goal._id}:${todayKey}`,
      });

      if (result) queued++;
    }

    logger.info({ queued }, "goalReminder: job complete");
  } catch (err) {
    logger.error({ err: err.message }, "goalReminder: fatal error");
  } finally {
    await releaseJobLock(LOCK_NAME);
  }
};

export const startGoalReminderJob = () => {
  // Daily at 09:00 UTC.
  cron.schedule("0 9 * * *", runJob);
  logger.info("[goal-reminder] Scheduled daily at 09:00 UTC.");
};

export const runGoalReminderJobOnce = runJob;
