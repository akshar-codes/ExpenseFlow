import React from "react";
import { GoalProgressBar } from "./GoalProgressBar";

const STATUS_CONFIG = {
  active: {
    label: "Active",
    color: "#4ade80",
    bg: "rgba(74,222,128,0.10)",
    border: "rgba(74,222,128,0.25)",
  },
  completed: {
    label: "Completed",
    color: "#4ade80",
    bg: "rgba(74,222,128,0.10)",
    border: "rgba(74,222,128,0.25)",
  },
  paused: {
    label: "Paused",
    color: "#facc15",
    bg: "rgba(250,204,21,0.10)",
    border: "rgba(250,204,21,0.25)",
  },
  cancelled: {
    label: "Cancelled",
    color: "#f87171",
    bg: "rgba(248,113,113,0.10)",
    border: "rgba(248,113,113,0.25)",
  },
};

const PRIORITY_CONFIG = {
  high: { label: "High priority", color: "#f87171" },
  medium: { label: "Medium priority", color: "#facc15" },
  low: { label: "Low priority", color: "#4ade80" },
};

const inrFmt = (v) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(v ?? 0);

function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function GoalCard({ goal, onEdit, onDelete, onViewDetails }) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const menuRef = React.useRef(null);

  const statusCfg = STATUS_CONFIG[goal.status] ?? STATUS_CONFIG.active;
  const priorityCfg = PRIORITY_CONFIG[goal.priority] ?? PRIORITY_CONFIG.medium;

  React.useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  return (
    <div
      className="relative rounded-xl border border-[#27272a] overflow-hidden group transition-all duration-200 hover:border-[#3f3f46]"
      style={{
        background: "linear-gradient(145deg, #18181b 0%, #141416 100%)",
        fontFamily: "'Sora', sans-serif",
      }}
      data-testid="goal-card"
    >
      {/* Goal-color left accent */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px]"
        style={{ background: goal.color ?? "#6366f1" }}
      />

      {/* Hover glow */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at top left, ${goal.color ?? "#6366f1"}18 0%, transparent 65%)`,
        }}
      />

      <div className="pl-5 pr-4 pt-4 pb-4 relative">
        {/* Header row */}
        <div className="flex items-start justify-between mb-3">
          <div className="min-w-0 flex-1 pr-2">
            <button
              className="text-sm font-semibold text-[#e4e4e7] hover:text-white transition-colors text-left truncate block max-w-full focus:outline-none"
              onClick={() => onViewDetails?.(goal)}
              aria-label={`View details for ${goal.title}`}
            >
              {goal.title}
            </button>
            {goal.category && (
              <p className="text-[11px] text-[#52525b] mt-0.5 truncate">
                {goal.category}
              </p>
            )}
          </div>

          {/* Action menu */}
          <div className="relative shrink-0" ref={menuRef}>
            <button
              className="w-7 h-7 flex items-center justify-center rounded-md text-[#52525b] hover:text-[#a1a1aa] hover:bg-[#27272a] transition-all focus:outline-none"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="Goal actions"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="currentColor"
              >
                <circle cx="7" cy="2.5" r="1.2" />
                <circle cx="7" cy="7" r="1.2" />
                <circle cx="7" cy="11.5" r="1.2" />
              </svg>
            </button>
            {menuOpen && (
              <div
                className="absolute right-0 mt-1 w-36 rounded-xl border border-[#27272a] z-20 overflow-hidden"
                style={{
                  background: "#18181b",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
                }}
              >
                <button
                  className="flex items-center gap-2 w-full px-3 py-2.5 text-[12px] text-[#a1a1aa] hover:text-[#e4e4e7] hover:bg-[#27272a] transition-colors"
                  onClick={() => {
                    setMenuOpen(false);
                    onEdit?.(goal);
                  }}
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                  Edit
                </button>
                <div className="h-px bg-[#27272a]" />
                <button
                  className="flex items-center gap-2 w-full px-3 py-2.5 text-[12px] text-[#f87171]/70 hover:text-[#f87171] hover:bg-[#f87171]/8 transition-colors"
                  onClick={() => {
                    setMenuOpen(false);
                    onDelete?.(goal);
                  }}
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14H6L5 6" />
                    <path d="M10 11v6M14 11v6" />
                    <path d="M9 6V4h6v2" />
                  </svg>
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Status + Priority badges */}
        <div className="flex items-center gap-1.5 flex-wrap mb-3">
          <span
            className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border"
            style={{
              color: statusCfg.color,
              background: statusCfg.bg,
              borderColor: statusCfg.border,
            }}
          >
            {statusCfg.label}
          </span>
          <span
            className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border"
            style={{
              color: priorityCfg.color,
              background: `${priorityCfg.color}12`,
              borderColor: `${priorityCfg.color}30`,
            }}
          >
            {priorityCfg.label}
          </span>
          {goal.isOverdue && (
            <span
              className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border"
              style={{
                color: "#f87171",
                background: "rgba(248,113,113,0.10)",
                borderColor: "rgba(248,113,113,0.25)",
              }}
            >
              Overdue
            </span>
          )}
        </div>

        {/* Progress bar */}
        <GoalProgressBar
          percentage={goal.progressPercentage}
          color={goal.color}
          showLabel={false}
          size="md"
        />

        {/* Progress label */}
        <div className="flex items-center justify-between mt-1.5 mb-3">
          <span
            className="text-[11px] text-[#52525b] tabular-nums"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            {goal.progressPercentage?.toFixed(1)}%
          </span>
          {goal.progressPercentage >= 100 && (
            <span className="text-[11px] font-semibold text-[#4ade80]">
              Completed ✓
            </span>
          )}
        </div>

        {/* Amount row */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[10px] text-[#52525b] uppercase tracking-wider mb-0.5">
              Saved
            </p>
            <p
              className="text-sm font-semibold tabular-nums text-[#e4e4e7]"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              {inrFmt(goal.currentAmount)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-[#52525b] uppercase tracking-wider mb-0.5">
              Goal
            </p>
            <p
              className="text-sm font-semibold tabular-nums text-[#a1a1aa]"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              {inrFmt(goal.targetAmount)}
            </p>
          </div>
        </div>

        {/* Footer row */}
        <div className="flex items-center justify-between pt-3 border-t border-[#27272a]/60">
          <p className="text-[11px] text-[#52525b]">
            {formatDate(goal.targetDate)}
          </p>
          {goal.status === "active" && (
            <span
              className="text-[11px] font-semibold tabular-nums"
              style={{
                color: goal.daysRemaining < 30 ? "#f87171" : "#71717a",
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              {goal.daysRemaining > 0
                ? `${goal.daysRemaining}d left`
                : "Past due"}
            </span>
          )}
          {goal.status === "completed" && goal.completedAt && (
            <span className="text-[11px] font-semibold text-[#4ade80]">
              Done ✓
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
