import React from "react";
import usePWA from "../../hooks/usePWA";

/**
 * Appears once a new service worker has finished installing in the
 * background (see PWAProvider's `onUpdateAvailable`). Reloading applies the
 * new version immediately via skipWaiting rather than waiting for every tab
 * to close.
 */
const UpdateAvailableBanner = () => {
  const { updateAvailable, reloadForUpdate } = usePWA();

  if (!updateAvailable) return null;

  return (
    <div
      className="flex items-center justify-between gap-3 px-4 py-2 border-b border-[#27272a]"
      style={{ background: "rgba(99,102,241,0.08)" }}
      role="status"
    >
      <p className="text-[12px] text-[#c7d2fe]">
        A new version of ExpenseTracker is available.
      </p>
      <button
        onClick={reloadForUpdate}
        className="text-[11px] font-semibold text-white px-3 py-1 rounded-lg"
        style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)" }}
      >
        Reload to update
      </button>
    </div>
  );
};

export default UpdateAvailableBanner;
