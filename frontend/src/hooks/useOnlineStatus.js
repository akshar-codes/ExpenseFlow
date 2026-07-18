import { useEffect, useState } from "react";

/**
 * Tracks browser connectivity via the online/offline events. `navigator.onLine`
 * only reflects link-layer state (e.g. Wi-Fi connected), not actual internet
 * reachability, but combined with the API's own network-error handling
 * elsewhere in the app this is sufficient for UI purposes without adding
 * polling overhead.
 */
const useOnlineStatus = () => {
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return isOnline;
};

export default useOnlineStatus;
