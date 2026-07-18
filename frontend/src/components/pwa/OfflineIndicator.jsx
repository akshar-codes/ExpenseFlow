import React from "react";
import usePWA from "../../hooks/usePWA";

/**
 * Slim, non-blocking banner communicating that the app is offline. Sits
 * above the sidebar/content so it's visible regardless of route.
 */
const OfflineIndicator = () => {
  const { isOnline } = usePWA();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center justify-center gap-2 px-4 py-1.5 text-xs font-medium"
      style={{
        background: "linear-gradient(90deg, #f59e0b, #f97316)",
        color: "#1c1300",
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full bg-[#1c1300] animate-pulse"
        aria-hidden
      />
      You're offline — changes you make now will be saved and synced
      automatically once you're back online.
    </div>
  );
};

export default OfflineIndicator;
