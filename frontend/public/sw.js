const CACHE_VERSION = "v1.0.0";
const STATIC_CACHE = `expensetracker-static-${CACHE_VERSION}`;
const API_CACHE = `expensetracker-api-${CACHE_VERSION}`;
const ALL_CACHES = [STATIC_CACHE, API_CACHE];

const OFFLINE_URL = "/offline.html";

const PRECACHE_URLS = [
  "/",
  "/index.html",
  OFFLINE_URL,
  "/manifest.webmanifest",
  "/logo.svg",
];

// API GET routes that are safe/useful to serve stale-while-offline.
// Matched by pathname prefix against same-origin /api requests.
const CACHEABLE_API_PREFIXES = [
  "/api/transactions",
  "/api/categories",
  "/api/analytics",
  "/api/budgets",
  "/api/goals",
  "/api/recurring",
];

const API_CACHE_MAX_AGE_MS = 5 * 60 * 1000; // 5 minutes

// ─── Install ────────────────────────────────────────────────────────────────

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      // addAll fails atomically if any request fails — use allSettled so a
      // single missing optional asset (e.g. offline.html not yet deployed)
      // never blocks installation of the rest of the shell.
      await Promise.allSettled(
        PRECACHE_URLS.map((url) =>
          cache.add(new Request(url, { cache: "reload" })),
        ),
      );
      self.skipWaiting();
    })(),
  );
});

// ─── Activate ─────────────────────────────────────────────────────────────

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const existingCaches = await caches.keys();
      await Promise.all(
        existingCaches
          .filter((name) => !ALL_CACHES.includes(name))
          .map((name) => caches.delete(name)),
      );
      await self.clients.claim();
    })(),
  );
});

// ─── Helpers ──────────────────────────────────────────────────────────────

const isApiRequest = (url) => url.pathname.startsWith("/api/");

const isCacheableApiGet = (request, url) =>
  request.method === "GET" &&
  CACHEABLE_API_PREFIXES.some((prefix) => url.pathname.startsWith(prefix));

const isStaticAsset = (request) =>
  ["style", "script", "font", "image"].includes(request.destination);

const putWithTimestamp = async (cacheName, request, response) => {
  const cache = await caches.open(cacheName);
  const cloned = response.clone();
  const headers = new Headers(cloned.headers);
  headers.set("sw-cached-at", String(Date.now()));
  const body = await cloned.blob();
  const stamped = new Response(body, {
    status: cloned.status,
    statusText: cloned.statusText,
    headers,
  });
  await cache.put(request, stamped);
  return response;
};


// ─── Strategies ─────────────────────────────────────────────────────────────

async function networkFirstNavigation(request) {
  try {
    const response = await fetch(request);
    await putWithTimestamp(STATIC_CACHE, "/index.html", response);
    return response;
  } catch {
    const cache = await caches.open(STATIC_CACHE);
    return (
      (await cache.match("/index.html")) ||
      (await cache.match(OFFLINE_URL)) ||
      Response.error()
    );
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);

  const networkPromise = fetch(request)
    .then((response) => {
      if (response && response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => undefined);

  return cached || (await networkPromise) || Response.error();
}

async function networkFirstApi(request) {
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      await putWithTimestamp(API_CACHE, request, response);
    }
    return response;
  } catch {
    const cache = await caches.open(API_CACHE);
    const cached = await cache.match(request);
    if (cached) {
      // Serve stale data with a marker header the frontend can inspect if
      // needed; freshness window is informational only for GET fallbacks.
      return cached;
    }
    return new Response(
      JSON.stringify({
        success: false,
        offline: true,
        message: "You're offline and no cached data is available yet.",
      }),
      {
        status: 503,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}

// ─── Fetch ────────────────────────────────────────────────────────────────

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" && !isApiRequest(new URL(request.url))) return;

  const url = new URL(request.url);

  // Only handle same-origin app requests; API calls may be cross-origin
  // (VITE_API_URL) so we match on pathname/hostname independently.
  const isSameOrigin = url.origin === self.location.origin;

  if (request.mode === "navigate") {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  if (isApiRequest(url) && isCacheableApiGet(request, url)) {
    event.respondWith(networkFirstApi(request));
    return;
  }

  // Mutating API requests: never intercept. Let them hit the network (or
  // fail) directly — the page-level offline queue handles the fallback.
  if (isApiRequest(url) && request.method !== "GET") {
    return;
  }

  if (isSameOrigin && isStaticAsset(request)) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }
});

// ─── Background Sync ────────────────────────────────────────────────────────
// Replays the IndexedDB-backed offline transaction queue. See
// utils/pwa/indexedDbQueue.js for the schema this reads/writes.

const SYNC_TAG_TRANSACTIONS = "sync-transactions";
const IDB_NAME = "expensetracker-pwa";
const IDB_VERSION = 1;
const STORE_QUEUE = "pendingTransactions";
const STORE_AUTH = "authToken";

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_QUEUE)) {
        db.createObjectStore(STORE_QUEUE, { keyPath: "localId" });
      }
      if (!db.objectStoreNames.contains(STORE_AUTH)) {
        db.createObjectStore(STORE_AUTH, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGetAll(db, storeName) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const req = tx.objectStore(storeName).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

async function idbDelete(db, storeName, key) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    tx.objectStore(storeName).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function idbPut(db, storeName, value) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    tx.objectStore(storeName).put(value);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getAccessToken(db) {
  const tx = db.transaction(STORE_AUTH, "readonly");
  const req = tx.objectStore(STORE_AUTH).get("current");
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result?.token || null);
    req.onerror = () => reject(req.error);
  });
}

async function broadcast(message) {
  const clientsList = await self.clients.matchAll({ type: "window" });
  clientsList.forEach((client) => client.postMessage(message));
}

async function refreshAccessToken(apiBase) {
  try {
    const res = await fetch(`${apiBase}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.accessToken || null;
  } catch {
    return null;
  }
}

async function drainTransactionQueue() {
  const db = await openDb();
  const pending = await idbGetAll(db, STORE_QUEUE);

  if (pending.length === 0) {
    await broadcast({ type: "SYNC_COMPLETE", synced: 0, failed: 0 });
    return;
  }

  await broadcast({ type: "SYNC_START", count: pending.length });

  let token = await getAccessToken(db);
  const apiBase = pending[0].apiBase;

  let synced = 0;
  let failed = 0;

  for (const item of pending) {
    try {
      let res = await fetch(`${item.apiBase}/transactions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify(item.payload),
      });

      if (res.status === 401) {
        token = await refreshAccessToken(item.apiBase);
        if (token) {
          await idbPut(db, STORE_AUTH, { id: "current", token });
          res = await fetch(`${item.apiBase}/transactions`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            credentials: "include",
            body: JSON.stringify(item.payload),
          });
        }
      }

      if (res.ok) {
        await idbDelete(db, STORE_QUEUE, item.localId);
        synced += 1;
      } else {
        failed += 1;
      }
    } catch {
      // Network still unavailable — leave item queued for the next attempt.
      failed += 1;
    }
  }

  await broadcast({ type: "SYNC_COMPLETE", synced, failed, apiBase });
}

self.addEventListener("sync", (event) => {
  if (event.tag === SYNC_TAG_TRANSACTIONS) {
    event.waitUntil(drainTransactionQueue());
  }
});

// Fallback path for browsers without Background Sync support (Safari,
// Firefox): the page posts this message directly when it detects it has
// come back online. See PWAProvider.jsx.
self.addEventListener("message", (event) => {
  if (event.data?.type === "MANUAL_SYNC_TRANSACTIONS") {
    event.waitUntil(drainTransactionQueue());
  }
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// ─── Push Notifications ─────────────────────────────────────────────────────

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {
      title: "ExpenseTracker",
      body: event.data ? event.data.text() : "",
    };
  }

  const title = payload.title || "ExpenseTracker";
  const options = {
    body: payload.body || "",
    icon: "/logo.svg",
    badge: "/logo.svg",
    tag: payload.tag || "expensetracker-notification",
    renotify: Boolean(payload.tag),
    data: { url: payload.url || "/dashboard" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/dashboard";

  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      const existing = clientList.find((c) => c.url.includes(targetUrl));
      if (existing) {
        await existing.focus();
        return;
      }
      const firstClient = clientList[0];
      if (firstClient) {
        await firstClient.focus();
        firstClient.postMessage({ type: "NAVIGATE", url: targetUrl });
        return;
      }
      if (self.clients.openWindow) {
        await self.clients.openWindow(targetUrl);
      }
    })(),
  );
});
