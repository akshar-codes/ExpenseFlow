// ─── HTTP status codes (subset most used in this project) ─────────────────────
export const HTTP = Object.freeze({
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL: 500,
});

// ─── Pagination defaults ───────────────────────────────────────────────────────
export const PAGINATION = Object.freeze({
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
});

// ─── Token lifetimes (must stay in sync with generateToken.js) ───────────────
export const TOKEN_TTL = Object.freeze({
  ACCESS_TOKEN_MINUTES: 15,
  REFRESH_TOKEN_DAYS: 7,
});

// ─── Transaction types ─────────────────────────────────────────────────────────
export const TX_TYPE = Object.freeze({
  INCOME: "income",
  EXPENSE: "expense",
});

// ─── Recurring frequency values ────────────────────────────────────────────────
export const FREQUENCY = Object.freeze({
  DAILY: "daily",
  WEEKLY: "weekly",
  MONTHLY: "monthly",
  YEARLY: "yearly",
});

// ─── Sort options (must match buildSort() in transaction.controller.js) ────────
export const TX_SORT = Object.freeze({
  LATEST: "latest",
  OLDEST: "oldest",
  HIGHEST: "highest",
  LOWEST: "lowest",
});

// ─── Rate-limit windows (milliseconds) ────────────────────────────────────────
export const RATE_LIMIT_WINDOW = Object.freeze({
  LOGIN_MS: 15 * 60 * 1000,
  REGISTER_MS: 60 * 60 * 1000,
});

// ─── CSV Import — supported sources ────────────────────────────────────────────
export const IMPORT_SOURCE = Object.freeze({
  HDFC: "hdfc",
  SBI: "sbi",
  ICICI: "icici",
  AXIS: "axis",
  KOTAK: "kotak",
  INDUSIND: "indusind",
  GOOGLE_PAY: "googlepay",
  PHONEPE: "phonepe",
  PAYTM: "paytm",
  NAVI: "navi",
});

// Sources that are traditional bank statements (paymentMethod defaults to
// "bank") vs. UPI wallet exports (paymentMethod defaults to "upi").
export const BANK_SOURCES = Object.freeze([
  IMPORT_SOURCE.HDFC,
  IMPORT_SOURCE.SBI,
  IMPORT_SOURCE.ICICI,
  IMPORT_SOURCE.AXIS,
  IMPORT_SOURCE.KOTAK,
  IMPORT_SOURCE.INDUSIND,
]);

// ─── CSV Import — batch lifecycle status ───────────────────────────────────────
export const IMPORT_STATUS = Object.freeze({
  PENDING: "pending",
  PROCESSING: "processing",
  COMPLETED: "completed",
  FAILED: "failed",
  ROLLED_BACK: "rolled_back",
});
