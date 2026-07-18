import { useCallback, useEffect, useState } from "react";
import {
  isPushSupported,
  getRegistration,
} from "../utils/pwa/serviceWorkerRegistration";
import { urlBase64ToUint8Array } from "../utils/pwa/pushKeyUtils";
import { subscribePush, unsubscribePush } from "../api/pushApi";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || "";

/**
 * Manages the browser Push subscription lifecycle. Requires the user to be
 * authenticated (subscription is tied to the logged-in user server-side) and
 * a registered service worker. Gracefully no-ops on unsupported browsers
 * (Safari < 16, Firefox on iOS, etc.) rather than throwing.
 */
const usePushNotifications = () => {
  const [permission, setPermission] = useState(() =>
    isPushSupported() ? Notification.permission : "unsupported",
  );
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const supported = isPushSupported() && Boolean(VAPID_PUBLIC_KEY);

  const refreshSubscription = useCallback(async () => {
    if (!supported) return;
    const registration = await getRegistration();
    if (!registration) return;
    const existing = await registration.pushManager.getSubscription();
    setSubscription(existing);
  }, [supported]);

  useEffect(() => {
    const init = async () => {
      await refreshSubscription();
    };
    init();
  }, [refreshSubscription]);

  const subscribe = useCallback(async () => {
    if (!supported) {
      setError("Push notifications aren't supported in this browser.");
      return null;
    }

    setLoading(true);
    setError("");

    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result !== "granted") {
        setError("Notification permission was not granted.");
        return null;
      }

      const registration = await getRegistration();
      if (!registration) {
        setError("Service worker is not ready yet. Please try again.");
        return null;
      }

      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      await subscribePush(sub);
      setSubscription(sub);
      return sub;
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to enable push notifications.",
      );
      return null;
    } finally {
      setLoading(false);
    }
  }, [supported]);

  const unsubscribe = useCallback(async () => {
    if (!subscription) return;
    setLoading(true);
    setError("");
    try {
      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();
      await unsubscribePush(endpoint);
      setSubscription(null);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to disable push notifications.",
      );
    } finally {
      setLoading(false);
    }
  }, [subscription]);

  return {
    supported,
    permission,
    isSubscribed: Boolean(subscription),
    loading,
    error,
    subscribe,
    unsubscribe,
  };
};

export default usePushNotifications;
