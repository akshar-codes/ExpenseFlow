const IDB_NAME = "expensetracker-pwa";
const IDB_VERSION = 1;
const STORE_QUEUE = "pendingTransactions";
const STORE_AUTH = "authToken";

let dbPromise = null;

const isIndexedDbSupported = () =>
  typeof window !== "undefined" && "indexedDB" in window;

const openDb = () => {
  if (!isIndexedDbSupported()) {
    return Promise.reject(
      new Error("IndexedDB is not supported in this browser."),
    );
  }

  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(IDB_NAME, IDB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_QUEUE)) {
        db.createObjectStore(STORE_QUEUE, { keyPath: "localId" });
      }
      if (!db.objectStoreNames.contains(STORE_AUTH)) {
        db.createObjectStore(STORE_AUTH, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
};

const runTx = async (storeName, mode, executor) => {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    let result;
    try {
      result = executor(store);
    } catch (err) {
      reject(err);
      return;
    }
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
};

const requestToPromise = (request) =>
  new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

// ─── Pending transaction queue ────────────────────────────────────────────

export const enqueueTransaction = async (payload, apiBase) => {
  const record = {
    localId:
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `local_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    payload,
    apiBase,
    createdAt: new Date().toISOString(),
    status: "pending",
    error: null,
  };

  await runTx(STORE_QUEUE, "readwrite", (store) => store.put(record));
  return record;
};

export const getPendingTransactions = async () => {
  if (!isIndexedDbSupported()) return [];
  const db = await openDb();
  const tx = db.transaction(STORE_QUEUE, "readonly");
  const request = tx.objectStore(STORE_QUEUE).getAll();
  return requestToPromise(request);
};

export const getPendingCount = async () => {
  const items = await getPendingTransactions();
  return items.length;
};

export const removePendingTransaction = async (localId) =>
  runTx(STORE_QUEUE, "readwrite", (store) => store.delete(localId));

export const clearPendingTransactions = async () =>
  runTx(STORE_QUEUE, "readwrite", (store) => store.clear());

export const markPendingTransactionFailed = async (localId, error) => {
  const db = await openDb();
  const tx = db.transaction(STORE_QUEUE, "readwrite");
  const store = tx.objectStore(STORE_QUEUE);
  const existing = await requestToPromise(store.get(localId));
  if (existing) {
    store.put({ ...existing, status: "failed", error: String(error) });
  }
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

// ─── Cached access token (read by the service worker during background sync) ──

export const setCachedAccessToken = async (token) => {
  if (!isIndexedDbSupported()) return;
  try {
    await runTx(STORE_AUTH, "readwrite", (store) =>
      store.put({ id: "current", token, updatedAt: new Date().toISOString() }),
    );
  } catch {
    // Non-fatal — background sync auth is a best-effort enhancement, not a
    // hard requirement for the app to function.
  }
};

export const clearCachedAccessToken = async () => {
  if (!isIndexedDbSupported()) return;
  try {
    await runTx(STORE_AUTH, "readwrite", (store) => store.delete("current"));
  } catch {
    // ignore
  }
};

export const isSupported = isIndexedDbSupported;
