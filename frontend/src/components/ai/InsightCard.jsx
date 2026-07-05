import React from "react";

// ── Type → visual config ───────────────────────────────────────────────────────

const TYPE_CONFIG = {
  spending_anomaly: {
    icon: "⚡",
    label: "Anomaly",
    accentColor: "#f87171",
    glowColor: "rgba(248,113,113,0.10)",
  },
  budget_recommendation: {
    icon: "◈",
    label: "Budget",
    accentColor: "#6366f1",
    glowColor: "rgba(99,102,241,0.10)",
  },
  saving_opportunity: {
    icon: "◎",
    label: "Opportunity",
    accentColor: "#4ade80",
    glowColor: "rgba(74,222,128,0.10)",
  },
  category_overuse: {
    icon: "↑",
    label: "Overuse",
    accentColor: "#fb923c",
    glowColor: "rgba(251,146,60,0.10)",
  },
  goal_progress: {
    icon: "🎯",
    label: "Goal",
    accentColor: "#a78bfa",
    glowColor: "rgba(167,139,250,0.10)",
  },
  positive_trend: {
    icon: "✓",
    label: "Positive",
    accentColor: "#4ade80",
    glowColor: "rgba(74,222,128,0.10)",
  },
};

const SEVERITY_BORDER = {
  high: "#f87171",
  medium: "#facc15",
  low: "#52525b",
  positive: "#4ade80",
};

const DEFAULT_CONFIG = {
  icon: "◉",
  label: "Insight",
  accentColor: "#6366f1",
  glowColor: "rgba(99,102,241,0.10)",
};

const inrFmt = (v) =>
  v != null ? `₹${Number(v).toLocaleString("en-IN")}` : null;

// ── Component ─────────────────────────────────────────────────────────────────

const InsightCard = ({ insight, onAction }) => {
  const cfg = TYPE_CONFIG[insight.type] ?? DEFAULT_CONFIG;
  const borderColor = SEVERITY_BORDER[insight.severity] ?? "#52525b";
  const amountLabel = inrFmt(insight.amount);

  return (
    <div
      className="relative rounded-xl border border-[#27272a] overflow-hidden group transition-all duration-200 hover:border-[#3f3f46]"
      style={{
        background: "linear-gradient(145deg, #18181b 0%, #141416 100%)",
      }}
    >
      {/* Left accent bar keyed to severity */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px]"
        style={{ background: borderColor }}
      />

      {/* Hover glow */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at top left, ${cfg.glowColor} 0%, transparent 65%)`,
        }}
      />

      <div className="pl-5 pr-4 py-4 relative">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            {/* Type icon badge */}
            <span
              className="w-7 h-7 rounded-lg flex items-center justify-center text-sm shrink-0 border"
              style={{
                background: `${cfg.accentColor}18`,
                borderColor: `${cfg.accentColor}30`,
                color: cfg.accentColor,
              }}
            >
              {cfg.icon}
            </span>

            {/* Type label + severity pill */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span
                className="text-[10px] font-semibold uppercase tracking-wider"
                style={{
                  color: cfg.accentColor,
                  fontFamily: "'Sora', sans-serif",
                }}
              >
                {cfg.label}
              </span>
              {insight.severity !== "positive" && (
                <span
                  className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full border"
                  style={{
                    color: borderColor,
                    background: `${borderColor}15`,
                    borderColor: `${borderColor}35`,
                  }}
                >
                  {insight.severity}
                </span>
              )}
            </div>
          </div>

          {/* Amount badge (when present) */}
          {amountLabel && (
            <span
              className="text-xs font-semibold tabular-nums shrink-0"
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                color: insight.severity === "positive" ? "#4ade80" : "#f87171",
              }}
            >
              {amountLabel}
            </span>
          )}
        </div>

        {/* Title */}
        <p
          className="text-sm font-semibold text-[#e4e4e7] mb-1 leading-snug"
          style={{ fontFamily: "'Sora', sans-serif" }}
        >
          {insight.title}
        </p>

        {/* Body */}
        <p
          className="text-[12px] text-[#71717a] leading-relaxed mb-3"
          style={{ fontFamily: "'Sora', sans-serif" }}
        >
          {insight.body}
        </p>

        {/* Footer: category tag + action button */}
        <div className="flex items-center justify-between gap-2">
          {insight.category ? (
            <span
              className="text-[10px] font-medium px-2 py-0.5 rounded-full border border-[#27272a] text-[#52525b]"
              style={{ fontFamily: "'Sora', sans-serif" }}
            >
              {insight.category}
            </span>
          ) : (
            <span />
          )}

          {insight.actionLabel && onAction && (
            <button
              onClick={() => onAction(insight)}
              className="text-[11px] font-medium px-2.5 py-1 rounded-lg border transition-all duration-150 shrink-0"
              style={{
                borderColor: `${cfg.accentColor}40`,
                color: cfg.accentColor,
                background: `${cfg.accentColor}10`,
                fontFamily: "'Sora', sans-serif",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = `${cfg.accentColor}20`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = `${cfg.accentColor}10`;
              }}
            >
              {insight.actionLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default InsightCard;
