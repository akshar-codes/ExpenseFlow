const SYNC_TAG_TRANSACTIONS = "sync-transactions";

export const isServiceWorkerSupported = () =>
  typeof navigator !== "undefined" && "serviceWorker" in navigator;

export const isBackgroundSyncSupported = () =>
  isServiceWorkerSupported() &&
  "SyncManager" in window &&
  "sync" in window.ServiceWorkerRegistration?.prototype;

export const isPushSupported = () =>
  isServiceWorkerSupported() &&
  "PushManager" in window &&
  "Notification" in window;

/**
 * Registers the service worker. Resolves with the registration, or null if
 * unsupported. Never throws — PWA capability must always degrade gracefully.
 */
export const registerServiceWorker = async ({ onUpdateAvailable } = {}) => {
  if (!isServiceWorkerSupported()) return null;

  try {
    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
    });

    registration.addEventListener("updatefound", () => {
      const installingWorker = registration.installing;
      if (!installingWorker) return;

      installingWorker.addEventListener("statechange", () => {
        if (
          installingWorker.state === "installed" &&
          navigator.serviceWorker.controller
        ) {
          onUpdateAvailable?.(registration);
        }
      });
    });

    return registration;
  } catch (err) {
    console.error("[pwa] Service worker registration failed:", err);
    return null;
  }
};

export const getRegistration = () =>
  isServiceWorkerSupported()
    ? navigator.serviceWorker.getRegistration()
    : Promise.resolve(null);

/**
 * Requests a Background Sync for the transaction queue. Falls back to
 * posting a direct message to the active worker (drained immediately) on
 * browsers without Background Sync support (Safari, Firefox).
 */
export const requestTransactionSync = async () => {
  const registration = await getRegistration();
  if (!registration) return false;

  if (isBackgroundSyncSupported()) {
    try {
      await registration.sync.register(SYNC_TAG_TRANSACTIONS);
      return true;
    } catch (err) {
      console.warn(
        "[pwa] Background sync registration failed, falling back:",
        err,
      );
    }
  }

  if (registration.active) {
    registration.active.postMessage({ type: "MANUAL_SYNC_TRANSACTIONS" });
    return true;
  }

  return false;
};

export const subscribeToMessages = (handler) => {
  if (!isServiceWorkerSupported()) return () => {};
  const listener = (event) => handler(event.data);
  navigator.serviceWorker.addEventListener("message", listener);
  return () => navigator.serviceWorker.removeEventListener("message", listener);
};

export const skipWaitingAndReload = async (registration) => {
  if (!registration?.waiting) return;
  registration.waiting.postMessage({ type: "SKIP_WAITING" });
  window.location.reload();
};
