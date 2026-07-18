import React from "react";
import OfflineIndicator from "./OfflineIndicator";
import UpdateAvailableBanner from "./UpdateAvailableBanner";
import InstallPromptBanner from "./InstallPromptBanner";

/**
 * Stacks the top-level PWA banners in priority order. Mount once near the
 * root of the authenticated layout (see layout/Layout.jsx). Each child
 * renders nothing when its condition isn't active, so this is safe to
 * always include.
 */
const PWAStatusBar = () => (
  <div className="sticky top-0 z-40">
    <OfflineIndicator />
    <UpdateAvailableBanner />
    <InstallPromptBanner />
  </div>
);

export default PWAStatusBar;
