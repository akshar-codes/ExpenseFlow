import React from "react";

const inrFmt = (v) =>
  v != null ? `₹${Number(v).toLocaleString("en-IN")}` : "—";

const CONFIDENCE_CONFIG = {
  high: { color: "#4ade80", label: "High confidence" },
  medium: { color: "#facc15", label: "Medium confidence" },
  low: { color: "#71717a", label: "Low confidence" },
};

const ProjRow = ({ label, value, color }) => (
  <div className="flex items-center justify-between py-2.5 border-b border-[#27272a]/40 last:border-0">
    <span
      className="text-[12px] text-[#71717a]"
      style={{ fontFamily: "'Sora', sans-serif" }}
    >
      {label}
    </span>
    <span
      className="text-sm font-semibold tabular-nums"
      style={{
        fontFamily: "'JetBrains Mono', monospace",
        color: color ?? "#e4e4e7",
      }}
    >
      {value}
    </span>
  </div>
);

const MonthEndPredictionCard = ({ prediction, period, loading }) => {
  if (loading) {
    return (
      <div
        className="rounded-xl border border-[#27272a] overflow-hidden animate-pulse"
        style={{
          background: "linear-gradient(145deg, #18181b 0%, #141416 100%)",
        }}
      >
        <div className="px-5 py-5 space-y-3">
          <div className="h-3 w-40 bg-[#27272a] rounded" />
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-3 w-full bg-[#27272a] rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (!prediction) return null;

  const {
    projectedExpense,
    projectedIncome,
    projectedBalance,
    confidence,
    note,
  } = prediction;

  const confCfg = CONFIDENCE_CONFIG[confidence] ?? CONFIDENCE_CONFIG.low;
  const balanceColor =
    projectedBalance == null
      ? "#e4e4e7"
      : projectedBalance >= 0
        ? "#4ade80"
        : "#f87171";

  const now = new Date();
  const daysInMonth = new Date(
    Date.UTC(
      period?.year ?? now.getUTCFullYear(),
      period?.month ?? now.getUTCMonth() + 1,
      0,
    ),
  ).getUTCDate();
  const daysRemaining = Math.max(0, daysInMonth - now.getUTCDate());

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
        style={{ background: "linear-gradient(180deg, #facc15, #f59e0b)" }}
      />

      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at top left, rgba(250,204,21,0.07) 0%, transparent 65%)",
        }}
      />

      <div className="pl-5 pr-5 py-5 relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span
              className="w-7 h-7 rounded-lg flex items-center justify-center text-sm shrink-0 border"
              style={{
                background: "rgba(250,204,21,0.12)",
                borderColor: "rgba(250,204,21,0.25)",
                color: "#facc15",
              }}
            >
              ◎
            </span>
            <p
              className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#52525b]"
              style={{ fontFamily: "'Sora', sans-serif" }}
            >
              Month-End Prediction
            </p>
          </div>
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded-full border"
            style={{
              color: confCfg.color,
              background: `${confCfg.color}15`,
              borderColor: `${confCfg.color}30`,
              fontFamily: "'Sora', sans-serif",
            }}
          >
            {confCfg.label}
          </span>
        </div>

        {/* Days remaining context */}
        <p
          className="text-[11px] text-[#3f3f46] mb-3"
          style={{ fontFamily: "'Sora', sans-serif" }}
        >
          {daysRemaining} day{daysRemaining !== 1 ? "s" : ""} remaining in month
          · based on current pace
        </p>

        {/* Projection rows */}
        <div>
          <ProjRow
            label="Projected Income"
            value={inrFmt(projectedIncome)}
            color="#4ade80"
          />
          <ProjRow
            label="Projected Expense"
            value={inrFmt(projectedExpense)}
            color="#f87171"
          />
          <ProjRow
            label="Projected Balance"
            value={inrFmt(projectedBalance)}
            color={balanceColor}
          />
        </div>

        {/* AI note */}
        {note && (
          <p
            className="text-[11px] text-[#52525b] italic mt-3 pt-3 border-t border-[#27272a]/50 leading-relaxed"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            {note}
          </p>
        )}
      </div>
    </div>
  );
};

export default MonthEndPredictionCard;
