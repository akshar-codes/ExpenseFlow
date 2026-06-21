const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_ENTRIES = 5_000; // circuit breaker against unbounded growth

const store = new Map(); // key -> { value, expiresAt }

// ─── Key namespacing ────────────────────────────────────────────────────────

export const buildKey = (userId, namespace, paramsObj = {}) => {
  if (!userId) throw new Error("cache.buildKey: userId is required");
  const paramsPart = Object.keys(paramsObj)
    .sort()
    .map((k) => `${k}=${paramsObj[k]}`)
    .join("&");
  return `analytics:${String(userId)}:${namespace}${paramsPart ? `:${paramsPart}` : ""}`;
};

// ─── Core ops ────────────────────────────────────────────────────────────────

export const get = (key) => {
  const entry = store.get(key);
  if (!entry) return undefined;
  if (entry.expiresAt <= Date.now()) {
    store.delete(key);
    return undefined;
  }
  return entry.value;
};

export const set = (key, value, ttlMs = DEFAULT_TTL_MS) => {
  if (store.size >= MAX_ENTRIES && !store.has(key)) {
    const oldestKey = store.keys().next().value;
    if (oldestKey !== undefined) store.delete(oldestKey);
  }
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
  return value;
};

export const del = (key) => store.delete(key);

// ─── Invalidate everything cached for a given user ─────────────────────────

export const invalidateUser = (userId) => {
  const prefix = `analytics:${String(userId)}:`;
  let removed = 0;
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) {
      store.delete(key);
      removed++;
    }
  }
  return removed;
};

// ─── wrap(): the primary call-site API ──────────────────────────────────────

export const wrap = async (key, computeFn, { ttlMs = DEFAULT_TTL_MS } = {}) => {
  const cached = get(key);
  if (cached !== undefined) return cached;

  const fresh = await computeFn();
  set(key, fresh, ttlMs);
  return fresh;
};

// ─── Test/ops helpers ────────────────────────────────────────────────────────

export const clearAll = () => store.clear();
export const size = () => store.size;

export default {
  get,
  set,
  del,
  wrap,
  buildKey,
  invalidateUser,
  clearAll,
  size,
};
