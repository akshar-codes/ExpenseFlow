import { useCallback, useEffect, useState } from "react";

const DISMISS_STORAGE_KEY = "pwa-install-dismissed-at";
const DISMISS_COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

const wasRecentlyDismissed = () => {
  const raw = localStorage.getItem(DISMISS_STORAGE_KEY);
  if (!raw) return false;
  const dismissedAt = Number(raw);
  if (!Number.isFinite(dismissedAt)) return false;
  return Date.now() - dismissedAt < DISMISS_COOLDOWN_MS;
};

/**
 * Captures the `beforeinstallprompt` event (Chrome/Edge/Android) so the app
 * can show a custom install affordance instead of relying on the browser's
 * default UI. Safari/iOS never fire this event — callers should treat
 * `isInstallable` as an enhancement, not a requirement.
 */
const useInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia?.("(display-mode: standalone)").matches,
  );

  useEffect(() => {
    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      if (wasRecentlyDismissed()) return;
      setDeferredPrompt(event);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return { outcome: "unavailable" };
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    return { outcome };
  }, [deferredPrompt]);

  const dismiss = useCallback(() => {
    localStorage.setItem(DISMISS_STORAGE_KEY, String(Date.now()));
    setDeferredPrompt(null);
  }, []);

  return {
    isInstallable: Boolean(deferredPrompt) && !isInstalled,
    isInstalled,
    promptInstall,
    dismiss,
  };
};

export default useInstallPrompt;
