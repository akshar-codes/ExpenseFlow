import EmailQueue, { EMAIL_STATUS } from "../../models/EmailQueue.js";
import User from "../../models/User.js";
import { isEmailTypeEnabled } from "./notificationPreference.service.js";
import logger from "../../config/logger.js";

const BACKOFF_BASE_MS = 60 * 1000; // 1 minute
const DEFAULT_BATCH_SIZE = 50;

/**
 * Enqueue an email for a user, respecting their notification preferences.
 */
export const enqueueEmail = async ({
  userId,
  type,
  payload = {},
  scheduledFor = new Date(),
  dedupeKey = null,
}) => {
  const allowed = await isEmailTypeEnabled(userId, type);
  if (!allowed) return null;

  const user = await User.findById(userId).select("email");
  if (!user?.email) {
    logger.warn({ userId, type }, "emailQueue: user has no email, skipping");
    return null;
  }

  try {
    return await EmailQueue.create({
      user: userId,
      type,
      payload,
      recipientEmail: user.email,
      scheduledFor,
      dedupeKey,
    });
  } catch (err) {
    // Duplicate dedupeKey for this user — already queued, not an error.
    if (err.code === 11000) {
      logger.debug(
        { userId, type, dedupeKey },
        "emailQueue: duplicate suppressed by dedupeKey",
      );
      return null;
    }
    throw err;
  }
};

/**
 * Atomically claim up to `limit` due, pending emails for processing. Uses a
 */
export const claimBatch = async (limit = DEFAULT_BATCH_SIZE) => {
  const claimed = [];

  for (let i = 0; i < limit; i++) {
    const doc = await EmailQueue.findOneAndUpdate(
      {
        status: EMAIL_STATUS.PENDING,
        scheduledFor: { $lte: new Date() },
      },
      { $set: { status: EMAIL_STATUS.PROCESSING } },
      { new: true, sort: { scheduledFor: 1 } },
    );

    if (!doc) break; // nothing left to claim
    claimed.push(doc);
  }

  return claimed;
};

export const markSent = async (id) => {
  await EmailQueue.updateOne(
    { _id: id },
    { $set: { status: EMAIL_STATUS.SENT, sentAt: new Date() } },
  );
};

/**
 * Record a failed send attempt. Reschedules with exponential backoff unless
 */
export const markFailed = async (doc, error) => {
  const attempts = doc.attempts + 1;
  const message = error?.message || String(error);

  if (attempts >= doc.maxAttempts) {
    await EmailQueue.updateOne(
      { _id: doc._id },
      { $set: { status: EMAIL_STATUS.FAILED, attempts, lastError: message } },
    );
    logger.error(
      { emailId: doc._id, type: doc.type, attempts },
      "emailQueue: permanently failed after max attempts",
    );
    return;
  }

  const backoffMs = BACKOFF_BASE_MS * Math.pow(2, attempts - 1);

  await EmailQueue.updateOne(
    { _id: doc._id },
    {
      $set: {
        status: EMAIL_STATUS.PENDING,
        attempts,
        lastError: message,
        scheduledFor: new Date(Date.now() + backoffMs),
      },
    },
  );
};
