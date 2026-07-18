import webpush from "web-push";
import logger from "../../config/logger.js";

let configured = false;

export const isPushConfigured = () => configured;

export const configureWebPush = () => {
  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;

  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    logger.warn(
      "[push] VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY not set — push notifications are disabled. " +
        "Generate a pair with `npx web-push generate-vapid-keys` to enable them.",
    );
    configured = false;
    return;
  }

  webpush.setVapidDetails(
    VAPID_SUBJECT || "mailto:support@expensetracker.app",
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY,
  );

  configured = true;
  logger.info("[push] Web Push configured with VAPID keys.");
};

export default webpush;
