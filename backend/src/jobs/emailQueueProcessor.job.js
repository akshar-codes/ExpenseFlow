import cron from "node-cron";
import {
  claimBatch,
  markSent,
  markFailed,
} from "../services/email/emailQueue.service.js";
import { renderTemplate } from "../services/email/templates/index.js";
import { sendMail } from "../services/email/mailer.js";
import { getOrCreatePreferences } from "../services/email/notificationPreference.service.js";
import { acquireJobLock, releaseJobLock } from "../utils/jobLock.js";
import logger from "../config/logger.js";

const LOCK_NAME = "email_queue_processor";
const LOCK_TTL_MS = 4 * 60 * 1000;
const BATCH_SIZE = 50;

const processOne = async (doc) => {
  try {
    const prefs = await getOrCreatePreferences(doc.user);
    const { subject, html, text } = renderTemplate(doc.type, doc.payload, {
      unsubscribeToken: prefs.unsubscribeToken,
    });

    await sendMail({ to: doc.recipientEmail, subject, html, text });
    await markSent(doc._id);
  } catch (err) {
    logger.error(
      { emailId: doc._id, type: doc.type, err: err.message },
      "emailQueueProcessor: send failed",
    );
    await markFailed(doc, err);
  }
};

const runJob = async () => {
  const acquired = await acquireJobLock(LOCK_NAME, LOCK_TTL_MS);
  if (!acquired) return;

  try {
    const batch = await claimBatch(BATCH_SIZE);
    if (batch.length === 0) return;

    logger.info({ count: batch.length }, "emailQueueProcessor: processing batch");

    // Sequential, not parallel — respects SMTP provider rate limits and
    // keeps retry/backoff bookkeeping simple and race-free.
    for (const doc of batch) {
      await processOne(doc);
    }
  } catch (err) {
    logger.error({ err: err.message }, "emailQueueProcessor: fatal error");
  } finally {
    await releaseJobLock(LOCK_NAME);
  }
};

export const startEmailQueueProcessor = () => {
  // Every minute — the queue itself controls actual send timing via
  // scheduledFor, so a tight interval just keeps latency low.
  cron.schedule("* * * * *", runJob);
  logger.info("[email-queue-processor] Scheduled every minute.");
};

// Exposed for manual/ops triggering and tests.
export const runEmailQueueProcessorOnce = runJob;
