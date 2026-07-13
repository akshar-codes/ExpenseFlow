import { startRecurringJob } from "./recurring.job.js";
import { startEmailQueueProcessor } from "./emailQueueProcessor.job.js";
import { startWeeklySummaryJob } from "./weeklySummary.job.js";
import { startMonthlySummaryJob } from "./monthlySummary.job.js";
import { startGoalReminderJob } from "./goalReminder.job.js";
import { startRecurringReminderJob } from "./recurringReminder.job.js";
import logger from "../config/logger.js";

/**
 * Starts every scheduled cron job for this process. Called once from
 */
export const startAllJobs = () => {
  startRecurringJob();
  startEmailQueueProcessor();
  startWeeklySummaryJob();
  startMonthlySummaryJob();
  startGoalReminderJob();
  startRecurringReminderJob();
  logger.info("[jobs] All scheduled jobs started.");
};
