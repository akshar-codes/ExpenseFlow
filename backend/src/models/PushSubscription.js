import mongoose from "mongoose";

/**
 * PushSubscription
 *
 * One document per browser/device push subscription (the Push API issues a
 * new, unique `endpoint` per browser installation — a single user can have
 * several, e.g. desktop + phone). `keys` holds the p256dh/auth values
 * required to encrypt payloads per RFC 8291, exactly as returned by
 * `PushSubscription.toJSON()` in the browser.
 */
const pushSubscriptionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    endpoint: {
      type: String,
      required: true,
      unique: true,
    },

    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true },
    },

    expirationTime: {
      type: Date,
      default: null,
    },

    userAgent: {
      type: String,
      trim: true,
      maxlength: 300,
      default: "",
    },

    lastSeenAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

// Primary query: all active subscriptions for a user, used when fanning out
// a push notification.
pushSubscriptionSchema.index({ user: 1, createdAt: -1 });

export default mongoose.model("PushSubscription", pushSubscriptionSchema);
