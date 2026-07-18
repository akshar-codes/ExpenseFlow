import { useContext } from "react";
import { PWAContext } from "../context/PWAContext";

const FALLBACK = {
  isOnline: true,
  pendingCount: 0,
  syncStatus: "idle",
  lastSyncResult: null,
  triggerSync: async () => {},
  refreshPendingCount: async () => {},
  isInstallable: false,
  isInstalled: false,
  promptInstall: async () => ({ outcome: "unavailable" }),
  dismiss: () => {},
  isPwaSupported: false,
  isBackgroundSyncSupported: false,
  updateAvailable: false,
  reloadForUpdate: () => {},
};

/**
 * Safe to call even outside <PWAProvider> (e.g. in isolated component tests)
 * — returns inert defaults instead of throwing.
 */
export const usePWA = () => {
  const context = useContext(PWAContext);
  return context ?? FALLBACK;
};

export default usePWA;
