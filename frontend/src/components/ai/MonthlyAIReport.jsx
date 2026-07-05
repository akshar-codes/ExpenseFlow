import React from "react";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const inrFmt = (v) =>
  v != null ? `₹${Number(v).toLocaleString("en-IN")}` : "—";

// ── Skeleton ──────────────────────────────────────────────────────────────────

const Skeleton = () => (
  <div
    className="rounded-xl border border-[#27272a] overflow-hidden animate-pulse"
    style={{ background: "linear-gradient(145deg, #18181b 0%, #141416 100%)" }}
  >
    <div className="px-5 py-5 space-y-3">
      <div className="h-3 w-40 bg-[#27272a] rounded" />
      <div className="h-5 w-3/4 bg-[#27272a] rounded" />
      <div className="h-3 w-full bg-[#27272a] rounded" />
      <div className="h-3 w-5/6 bg-[#27272a] rounded" />
    </div>
  </div>
);

// ── Stat pill ─────────────────────────────────────────────────────────────────

const StatPill = ({ label, value, color }) => (
  <div
    className="flex flex-col items-center px-4 py-2.5 rounded-lg border border-[#27272a]"
    style={{ background: "rgba(255,255,255,0.02)" }}
  >
    <span
      className="text-[10px] font-semibold uppercase tracking-wider text-[#52525b] mb-0.5"
      style={{ fontFamily: "'Sora', sans-serif" }}
    >
      {label}
    </span>
    <span
      className="text-sm font-bold tabular-nums"
      style={{
        fontFamily: "'JetBrains Mono', monospace",
        color: color ?? "#e4e4e7",
      }}
    >
      {value}
    </span>
  </div>
);

// ── Component ─────────────────────────────────────────────────────────────────

const MonthlyAIReport = ({ monthlySummary, snapshot, period, loading }) => {
  if (loading) return <Skeleton />;

  const monthName = period?.month ? MONTH_NAMES[period.month - 1] : "";
  const year = period?.year ?? "";

  const income = snapshot?.current?.income ?? null;
  const expense = snapshot?.current?.expense ?? null;
  const balance = snapshot?.current?.balance ?? null;
  const savings = snapshot?.savingsRate ?? null;

  const balanceColor =
    balance == null ? "#e4e4e7" : balance >= 0 ? "#4ade80" : "#f87171";

  return (
    <div
      className="relative rounded-xl border border-[#27272a] overflow-hidden group transition-all duration-200 hover:border-[#3f3f46]"
      style={{
        background: "linear-gradient(145deg, #18181b 0%, #141416 100%)",
      }}
    >
      {/* Accent bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px]"
        style={{ background: "linear-gradient(180deg, #6366f1, #a78bfa)" }}
      />

      {/* Hover glow */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at top left, rgba(99,102,241,0.08) 0%, transparent 65%)",
        }}
      />

      <div className="pl-5 pr-5 py-5 relative">
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <span
            className="w-7 h-7 rounded-lg flex items-center justify-center text-sm shrink-0 border"
            style={{
              background: "rgba(99,102,241,0.12)",
              borderColor: "rgba(99,102,241,0.25)",
              color: "#a5b4fc",
            }}
          >
            ◉
          </span>
          <div>
            <p
              className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#52525b]"
              style={{ fontFamily: "'Sora', sans-serif" }}
            >
              Monthly AI Report
            </p>
            <p
              className="text-[11px] text-[#3f3f46]"
              style={{ fontFamily: "'Sora', sans-serif" }}
            >
              {monthName} {year}
            </p>
          </div>
        </div>

        {/* AI headline */}
        {monthlySummary?.headline && (
          <p
            className="text-sm font-semibold text-[#e4e4e7] mb-2 leading-snug"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            {monthlySummary.headline}
          </p>
        )}

        {/* AI narrative */}
        {monthlySummary?.narrative && (
          <p
            className="text-[12px] text-[#71717a] leading-relaxed mb-4"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            {monthlySummary.narrative}
          </p>
        )}

        {!monthlySummary?.headline && !monthlySummary?.narrative && (
          <p
            className="text-[12px] text-[#52525b] italic mb-4"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            AI summary unavailable. Showing financial data only.
          </p>
        )}

        {/* Key stats row */}
        {(income != null || expense != null || balance != null) && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <StatPill label="Income" value={inrFmt(income)} color="#4ade80" />
            <StatPill
              label="Expenses"
              value={inrFmt(expense)}
              color="#f87171"
            />
            <StatPill
              label="Net Balance"
              value={inrFmt(balance)}
              color={balanceColor}
            />
            <StatPill
              label="Savings Rate"
              value={savings != null ? `${savings}%` : "—"}
              color={
                savings == null
                  ? "#e4e4e7"
                  : savings >= 20
                    ? "#4ade80"
                    : savings > 0
                      ? "#facc15"
                      : "#f87171"
              }
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default MonthlyAIReport;
