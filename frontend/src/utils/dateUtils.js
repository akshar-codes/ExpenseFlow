// ─── Helpers ──────────────────────────────────────────────────────────────────

const utcDateKey = (d) =>
  `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;

// ─── Public API ───────────────────────────────────────────────────────────────

export const formatTransactionDate = (dateInput) => {
  const d = new Date(dateInput);
  const now = new Date();

  const todayKey = utcDateKey(now);

  const yesterdayUtc = new Date(now);
  yesterdayUtc.setUTCDate(now.getUTCDate() - 1);
  const yesterdayKey = utcDateKey(yesterdayUtc);

  const dKey = utcDateKey(d);

  if (dKey === todayKey) return "Today";
  if (dKey === yesterdayKey) return "Yesterday";

  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
};

export const formatRecentDate = (dateInput) => {
  const d = new Date(dateInput);
  const now = new Date();

  const todayKey = utcDateKey(now);
  const yesterdayUtc = new Date(now);
  yesterdayUtc.setUTCDate(now.getUTCDate() - 1);
  const yesterdayKey = utcDateKey(yesterdayUtc);
  const dKey = utcDateKey(d);

  if (dKey === todayKey) return "Today";
  if (dKey === yesterdayKey) return "Yesterday";

  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
};

export const formatFullDate = (dateInput) => {
  if (!dateInput) return "—";
  return new Date(dateInput).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
};
