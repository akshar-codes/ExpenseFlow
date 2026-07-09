const MONTHS = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

export const normalizeText = (value) =>
  typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";

/**
 * Given raw CSV headers and an aliasSpec ({ field: [aliasHeaders...] }),
 * return the best-guess column map { field: actualHeaderName }.
 */
export const guessColumnMap = (headers, aliasSpec) => {
  const normalizedHeaders = headers.map((h) => ({
    original: h,
    key: h.toLowerCase().replace(/[^a-z0-9]/g, ""),
  }));

  const map = {};

  Object.entries(aliasSpec).forEach(([field, aliases]) => {
    const normalizedAliases = aliases.map((a) =>
      a.toLowerCase().replace(/[^a-z0-9]/g, ""),
    );

    const match = normalizedHeaders.find((h) =>
      normalizedAliases.includes(h.key),
    );

    if (match) {
      map[field] = match.original;
    }
  });

  return map;
};

/**
 * Parse a currency-ish string into a signed float, or null if unparseable.
 * Handles: "1,234.50", "-1234.50", "(1234.50)" (accounting negative), "₹1,234".
 */
export const parseAmount = (raw) => {
  if (raw === null || raw === undefined) return null;
  let str = String(raw).trim();
  if (str === "" || str === "-") return null;

  let negative = false;
  if (/^\(.*\)$/.test(str)) {
    negative = true;
    str = str.slice(1, -1);
  }
  if (/^-/.test(str)) {
    negative = true;
  }

  str = str.replace(/[^\d.]/g, "");
  if (str === "") return null;

  const value = parseFloat(str);
  if (!isFinite(value)) return null;

  return negative ? -Math.abs(value) : value;
};

/**
 * Parse common Indian bank/wallet date formats into a UTC Date, or null.
 * Supports: YYYY-MM-DD[THH:mm:ss], DD/MM/YYYY, DD-MM-YYYY, DD Mon YYYY.
 */
export const parseDateFlexible = (raw) => {
  if (!raw) return null;
  const str = String(raw).trim();
  if (!str) return null;

  // ISO: 2024-05-12 or 2024-05-12T10:00:00
  let m = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) {
    const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    if (!isNaN(d.getTime())) return d;
  }

  // DD/MM/YYYY or DD-MM-YYYY (India-first; falls back to MM/DD if needed)
  m = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
  if (m) {
    let [, a, b, y] = m;
    a = +a;
    b = +b;
    y = +y;
    if (y < 100) y += 2000;

    let day = a;
    let month = b;
    if (a > 12 && b <= 12) {
      day = a;
      month = b;
    } else if (b > 12 && a <= 12) {
      day = b;
      month = a;
    }

    const d = new Date(Date.UTC(y, month - 1, day));
    if (!isNaN(d.getTime())) return d;
  }

  // DD Mon YYYY / DD-Mon-YYYY (e.g. "12 May 2024", "12-May-2024")
  m = str.match(/^(\d{1,2})[\s-]([A-Za-z]{3,})[\s-](\d{2,4})/);
  if (m) {
    const day = +m[1];
    const monthKey = m[2].slice(0, 3).toLowerCase();
    const month = MONTHS[monthKey];
    let year = +m[3];
    if (year < 100) year += 2000;
    if (month) {
      const d = new Date(Date.UTC(year, month - 1, day));
      if (!isNaN(d.getTime())) return d;
    }
  }

  // Last resort: native parsing
  const native = new Date(str);
  return isNaN(native.getTime()) ? null : native;
};

/**
 * Resolve { amount, type } from either separate debit/credit columns
 * (bank statements) or a single amount column + a type hint (wallets).
 */
export const resolveTypeAndAmount = ({ debit, credit, amount, typeHint }) => {
  const debitAmt = parseAmount(debit);
  const creditAmt = parseAmount(credit);

  if (debitAmt != null && debitAmt !== 0) {
    return { amount: Math.abs(debitAmt), type: "expense" };
  }
  if (creditAmt != null && creditAmt !== 0) {
    return { amount: Math.abs(creditAmt), type: "income" };
  }

  const amt = parseAmount(amount);
  if (amt == null) return { amount: null, type: null };

  if (typeHint) {
    const hint = typeHint.toLowerCase();
    if (/(debit|dr\b|paid|sent|withdraw)/.test(hint)) {
      return { amount: Math.abs(amt), type: "expense" };
    }
    if (/(credit|cr\b|received|deposit)/.test(hint)) {
      return { amount: Math.abs(amt), type: "income" };
    }
  }

  return { amount: Math.abs(amt), type: amt < 0 ? "expense" : "income" };
};

/**
 * Build a normalizeRow() function for bank statement CSVs, which typically
 * have separate Debit / Credit (or Withdrawal / Deposit) columns.
 */
export const buildStatementNormalizer = () => {
  return (row, columnMap) => {
    const get = (field) => row[columnMap[field]];

    const date = parseDateFlexible(get("date"));
    const description = normalizeText(get("description"));
    const refNo = normalizeText(get("refNo"));
    const balance = parseAmount(get("balance"));

    const { amount, type } = resolveTypeAndAmount({
      debit: get("debit"),
      credit: get("credit"),
      amount: get("amount"),
      typeHint: get("type"),
    });

    return { date, description, amount, type, refNo, balance };
  };
};

/**
 * Build a normalizeRow() function for UPI wallet exports (Google Pay,
 * PhonePe, Paytm), which typically have a single Amount column and either
 * a Type column or descriptive text ("Paid to X", "Received from Y").
 */
export const buildWalletNormalizer = () => {
  return (row, columnMap) => {
    const get = (field) => row[columnMap[field]];

    const date = parseDateFlexible(get("date"));
    const description = normalizeText(get("description"));
    const refNo = normalizeText(get("refNo"));

    const { amount, type } = resolveTypeAndAmount({
      amount: get("amount"),
      typeHint: get("type") || get("description"),
    });

    return { date, description, amount, type, refNo, balance: null };
  };
};

/**
 * Generic detect() scorer: fraction of aliasSpec fields resolved via
 * guessColumnMap, optionally boosted by a source-specific header hint.
 * NOTE: this only informs the UI's "auto-detect confidence" indicator —
 * the user always explicitly picks the source, so this never gates parsing.
 */
export const scoreDetection = (headers, aliasSpec, bonus = 0) => {
  const map = guessColumnMap(headers, aliasSpec);
  const hits = Object.keys(map).length;
  const total = Object.keys(aliasSpec).length || 1;
  return Math.min(1, hits / total + bonus);
};
