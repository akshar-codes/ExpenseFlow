import { useCallback, useEffect, useRef, useState } from "react";
import { PWAContext } from "./PWAContext";
import useOnlineStatus from "../hooks/useOnlineStatus";
import useInstallPrompt from "../hooks/useInstallPrompt";
import {
  registerServiceWorker,
  requestTransactionSync,
  subscribeToMessages,
  skipWaitingAndReload,
  isServiceWorkerSupported,
  isBackgroundSyncSupported,
} from "../utils/pwa/serviceWorkerRegistration";
import { getPendingCount } from "../utils/pwa/indexedDbQueue";

import { SYNC_COMPLETE_EVENT, QUEUE_CHANGED_EVENT } from "../utils/pwa/pwaEvents";

export const PWAProvider = ({ children }) => {
  const isOnline = useOnlineStatus();
  const install = useInstallPrompt();

  const [registration, setRegistration] = useState(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncStatus, setSyncStatus] = useState("idle"); // idle | syncing | success | error
  const [lastSyncResult, setLastSyncResult] = useState(null);

  const wasOfflineRef = useRef(false);

  const refreshPendingCount = useCallback(async () => {
    try {
      const count = await getPendingCount();
      setPendingCount(count);
    } catch {
      // IndexedDB unavailable (private browsing, unsupported) — degrade
      // silently to a zero count rather than surfacing an error banner.
      setPendingCount(0);
    }
  }, []);

  // ── Register service worker once on mount ──────────────────────────────
  useEffect(() => {
    let cancelled = false;

    registerServiceWorker({
      onUpdateAvailable: () => setUpdateAvailable(true),
    }).then((reg) => {
      if (!cancelled) setRegistration(reg);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  // ── Listen for sync progress/result messages from the service worker ───
  useEffect(() => {
    const unsubscribe = subscribeToMessages((data) => {
      if (!data) return;

      if (data.type === "SYNC_START") {
        setSyncStatus("syncing");
      }

      if (data.type === "SYNC_COMPLETE") {
        refreshPendingCount();
        setLastSyncResult({ synced: data.synced, failed: data.failed });
        setSyncStatus(data.failed > 0 ? "error" : "success");
        if (data.synced > 0) {
          window.dispatchEvent(
            new CustomEvent(SYNC_COMPLETE_EVENT, { detail: data }),
          );
        }
        // Return to idle after a moment so the "success" pill doesn't linger.
        setTimeout(() => setSyncStatus("idle"), 4000);
      }
    });

    return unsubscribe;
  }, [refreshPendingCount]);

  // ── Track the offline queue size ────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      await refreshPendingCount();
    };
    init();
    window.addEventListener(QUEUE_CHANGED_EVENT, refreshPendingCount);
    return () =>
      window.removeEventListener(QUEUE_CHANGED_EVENT, refreshPendingCount);
  }, [refreshPendingCount]);

  const triggerSync = useCallback(async () => {
    const count = await getPendingCount().catch(() => 0);
    if (count === 0) return;
    setSyncStatus("syncing");
    await requestTransactionSync();
  }, []);

  // ── Trigger a sync automatically when connectivity returns ─────────────
  useEffect(() => {
    if (!isOnline) {
      wasOfflineRef.current = true;
      return;
    }

    if (wasOfflineRef.current) {
      wasOfflineRef.current = false;
      triggerSync();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline]);

  const reloadForUpdate = useCallback(() => {
    skipWaitingAndReload(registration);
  }, [registration]);

  const value = {
    // Connectivity
    isOnline,
    // Sync
    pendingCount,
    syncStatus,
    lastSyncResult,
    triggerSync,
    refreshPendingCount,
    // Install
    ...install,
    // Service worker lifecycle
    isPwaSupported: isServiceWorkerSupported(),
    isBackgroundSyncSupported: isBackgroundSyncSupported(),
    updateAvailable,
    reloadForUpdate,
  };

  return <PWAContext.Provider value={value}>{children}</PWAContext.Provider>;
};

export default PWAProvider;
