import PushSubscription from "../../models/PushSubscription.js";
import webpush, { isPushConfigured } from "./webPush.config.js";
import { ServiceError } from "../../utils/ServiceError.js";
import logger from "../../config/logger.js";

// ─── Subscription management ──────────────────────────────────────────────

/**
 * Upserts a subscription by its unique endpoint. If the same browser
 * re-subscribes (e.g. after clearing site data) this simply refreshes the
 * keys/owner rather than creating a duplicate row.
 */
export const subscribeService = async (userId, body = {}, userAgent = "") => {
  const { endpoint, keys, expirationTime } = body;

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    throw new ServiceError(
      "endpoint, keys.p256dh, and keys.auth are required",
      400,
    );
  }

  return PushSubscription.findOneAndUpdate(
    { endpoint },
    {
      user: userId,
      endpoint,
      keys: { p256dh: keys.p256dh, auth: keys.auth },
      expirationTime: expirationTime ? new Date(expirationTime) : null,
      userAgent: userAgent.slice(0, 300),
      lastSeenAt: new Date(),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
};

export const unsubscribeService = async (userId, endpoint) => {
  if (!endpoint) {
    throw new ServiceError("endpoint is required", 400);
  }

  const result = await PushSubscription.findOneAndDelete({
    endpoint,
    user: userId,
  });

  if (!result) {
    throw new ServiceError("Subscription not found", 404);
  }

  return result;
};

// ─── Sending ──────────────────────────────────────────────────────────────

/**
 * Sends a push notification to every device subscribed for a user.
 * Fire-and-forget by convention (callers should `.catch()` and log rather
 * than await this inline in a request/response cycle) — mirrors
 * enqueueEmail's non-blocking usage throughout the codebase. Subscriptions
 * that the push service reports as gone (410/404) are pruned automatically.
 *
 * @param {string|import("mongoose").Types.ObjectId} userId
 * @param {{ title: string, body: string, url?: string, tag?: string }} payload
 */
export const sendPushToUser = async (userId, payload) => {
  if (!isPushConfigured()) return { sent: 0, skipped: "not_configured" };

  const subscriptions = await PushSubscription.find({ user: userId }).lean();
  if (subscriptions.length === 0)
    return { sent: 0, skipped: "no_subscriptions" };

  const body = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url || "/dashboard",
    tag: payload.tag,
  });

  const results = await Promise.allSettled(
    subscriptions.map((sub) =>
      webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: sub.keys,
        },
        body,
      ),
    ),
  );

  let sent = 0;
  const staleEndpoints = [];

  results.forEach((result, idx) => {
    if (result.status === "fulfilled") {
      sent += 1;
      return;
    }

    const statusCode = result.reason?.statusCode;
    if (statusCode === 404 || statusCode === 410) {
      staleEndpoints.push(subscriptions[idx].endpoint);
    } else {
      logger.warn(
        { userId: String(userId), err: result.reason?.message },
        "push.service: send failed",
      );
    }
  });

  if (staleEndpoints.length > 0) {
    await PushSubscription.deleteMany({ endpoint: { $in: staleEndpoints } });
  }

  return { sent, pruned: staleEndpoints.length };
};

export const listSubscriptionsForUser = (userId) =>
  PushSubscription.find({ user: userId })
    .select("-keys")
    .sort({ createdAt: -1 });
