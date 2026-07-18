export const SYNC_COMPLETE_EVENT = "pwa:sync-complete";
export const QUEUE_CHANGED_EVENT = "pwa:queue-changed";

export const notifyQueueChanged = () => {
  window.dispatchEvent(new CustomEvent(QUEUE_CHANGED_EVENT));
};
