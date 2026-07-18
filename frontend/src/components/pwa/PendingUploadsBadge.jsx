import React from "react";
import usePWA from "../../hooks/usePWA";

/**
 * Shows the count of transactions queued locally while offline (or while a
 * request failed). Offers a manual "Sync now" action once back online —
 * useful since Background Sync isn't available on Safari/Firefox, and even
 * on supported browsers the user may want to force a retry.
 */
const PendingUploadsBadge = () => {
  const { pendingCount, isOnline, triggerSync, syncStatus } = usePWA();

  if (pendingCount === 0) return null;

  return (
    <div
      className="flex items-center gap-2 text-[11px] font-medium px-2.5 py-1 rounded-full border"
      style={{
        color: "#a5b4fc",
        background: "rgba(99,102,241,0.10)",
        borderColor: "rgba(99,102,241,0.3)",
      }}
      title={`${pendingCount} transaction${pendingCount === 1 ? "" : "s"} waiting to sync`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-[#818cf8]" aria-hidden />
      {pendingCount} pending upload{pendingCount === 1 ? "" : "s"}
      {isOnline && syncStatus !== "syncing" && (
        <button
          onClick={triggerSync}
          className="text-[10px] font-semibold underline decoration-dotted hover:text-white transition-colors"
        >
          Sync now
        </button>
      )}
    </div>
  );
};

export default PendingUploadsBadge;
