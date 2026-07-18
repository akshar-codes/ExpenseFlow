import React from "react";
import usePWA from "../../hooks/usePWA";

/**
 * Custom install affordance. Only renders when the browser has actually
 * fired `beforeinstallprompt` (Chrome/Edge/Android) and the user hasn't
 * dismissed it recently — see useInstallPrompt for the cooldown logic.
 */
const InstallPromptBanner = () => {
  const { isInstallable, promptInstall, dismiss } = usePWA();

  if (!isInstallable) return null;

  return (
    <div
      className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-[#27272a]"
      style={{ background: "#111114" }}
      role="region"
      aria-label="Install ExpenseTracker"
    >
      <div className="flex items-center gap-3 min-w-0">
        <img src="/logo.svg" alt="" className="w-7 h-7 rounded-md shrink-0" />
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-[#e4e4e7] truncate">
            Install ExpenseTracker
          </p>
          <p className="text-[11px] text-[#71717a] truncate">
            Get the full-screen app experience with offline access.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={dismiss}
          className="text-[12px] text-[#71717a] hover:text-[#a1a1aa] px-2 py-1.5 rounded-lg transition-colors"
        >
          Not now
        </button>
        <button
          onClick={promptInstall}
          className="text-[12px] font-medium text-white px-3.5 py-1.5 rounded-lg transition-all"
          style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)" }}
        >
          Install
        </button>
      </div>
    </div>
  );
};

export default InstallPromptBanner;
