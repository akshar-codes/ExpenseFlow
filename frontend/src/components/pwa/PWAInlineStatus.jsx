import React from "react";
import SyncStatusBadge from "./SyncStatusBadge";
import PendingUploadsBadge from "./PendingUploadsBadge";

/**
 * Compact pair of pills for inline placement (sidebar footer, toolbar).
 * Renders nothing if there's neither an active sync nor a pending queue.
 */
const PWAInlineStatus = ({ className = "" }) => (
  <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
    <SyncStatusBadge />
    <PendingUploadsBadge />
  </div>
);

export default PWAInlineStatus;
