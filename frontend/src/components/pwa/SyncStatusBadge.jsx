import React from "react";
import usePWA from "../../hooks/usePWA";

const CONFIG = {
  syncing: {
    label: "Syncing…",
    color: "#facc15",
    bg: "rgba(250,204,21,0.12)",
    border: "rgba(250,204,21,0.3)",
    spin: true,
  },
  success: {
    label: "All changes synced",
    color: "#4ade80",
    bg: "rgba(74,222,128,0.12)",
    border: "rgba(74,222,128,0.3)",
    spin: false,
  },
  error: {
    label: "Some changes failed to sync",
    color: "#f87171",
    bg: "rgba(248,113,113,0.12)",
    border: "rgba(248,113,113,0.3)",
    spin: false,
  },
};

/**
 * Transient pill reflecting the current background-sync state. Renders
 * nothing while idle so it never clutters the UI outside of an active sync.
 */
const SyncStatusBadge = () => {
  const { syncStatus, lastSyncResult } = usePWA();

  if (syncStatus === "idle") return null;

  const cfg = CONFIG[syncStatus] ?? CONFIG.syncing;

  return (
    <span
      className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full border"
      style={{ color: cfg.color, background: cfg.bg, borderColor: cfg.border }}
      role="status"
      aria-live="polite"
    >
      {cfg.spin ? (
        <span
          className="w-2.5 h-2.5 rounded-full border-2 border-current border-t-transparent animate-spin"
          aria-hidden
        />
      ) : (
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: cfg.color }}
        />
      )}
      {cfg.label}
      {syncStatus === "error" && lastSyncResult?.failed ? (
        <span className="opacity-70">({lastSyncResult.failed})</span>
      ) : null}
    </span>
  );
};

export default SyncStatusBadge;
