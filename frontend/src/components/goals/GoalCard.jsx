import React from "react";
import { GoalProgressBar } from "./GoalProgressBar";
import {
  Target,
  TrendingUp,
  Calendar,
  AlertTriangle,
  CheckCircle,
  PauseCircle,
  XCircle,
  MoreVertical,
  Pencil,
  Trash2,
} from "lucide-react";

const STATUS_CONFIG = {
  active: {
    label: "Active",
    icon: TrendingUp,
    className:
      "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  },
  completed: {
    label: "Completed",
    icon: CheckCircle,
    className:
      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  },
  paused: {
    label: "Paused",
    icon: PauseCircle,
    className:
      "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  },
  cancelled: {
    label: "Cancelled",
    icon: XCircle,
    className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  },
};

const PRIORITY_CONFIG = {
  high: {
    label: "High",
    className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  },
  medium: {
    label: "Medium",
    className:
      "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  },
  low: {
    label: "Low",
    className: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400",
  },
};

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function GoalCard({ goal, onEdit, onDelete, onViewDetails }) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const menuRef = React.useRef(null);

  const statusCfg = STATUS_CONFIG[goal.status] ?? STATUS_CONFIG.active;
  const priorityCfg = PRIORITY_CONFIG[goal.priority] ?? PRIORITY_CONFIG.medium;
  const StatusIcon = statusCfg.icon;

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
      className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm hover:shadow-md transition-shadow"
      data-testid="goal-card"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
            style={{
              backgroundColor: `${goal.color}20`,
              border: `2px solid ${goal.color}`,
            }}
            aria-hidden="true"
          >
            <Target size={18} style={{ color: goal.color }} />
          </div>
          <div className="min-w-0">
            <button
              className="text-base font-semibold text-gray-900 dark:text-white hover:underline text-left truncate block max-w-[180px]"
              onClick={() => onViewDetails?.(goal)}
              aria-label={`View details for ${goal.title}`}
            >
              {goal.title}
            </button>
            {goal.category && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {goal.category}
              </span>
            )}
          </div>
        </div>

        {/* Action menu */}
        <div className="relative flex-shrink-0" ref={menuRef}>
          <button
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Goal actions"
          >
            <MoreVertical size={16} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-1 w-40 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-10">
              <button
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-t-lg"
                onClick={() => {
                  setMenuOpen(false);
                  onEdit?.(goal);
                }}
              >
                <Pencil size={14} /> Edit
              </button>
              <button
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-b-lg"
                onClick={() => {
                  setMenuOpen(false);
                  onDelete?.(goal);
                }}
              >
                <Trash2 size={14} /> Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Status + Priority badges */}
      <div className="flex items-center gap-2 mb-4">
        <span
          className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${statusCfg.className}`}
        >
          <StatusIcon size={11} />
          {statusCfg.label}
        </span>
        <span
          className={`text-xs font-medium px-2 py-0.5 rounded-full ${priorityCfg.className}`}
        >
          {priorityCfg.label} priority
        </span>
        {goal.isOverdue && (
          <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
            <AlertTriangle size={11} /> Overdue
          </span>
        )}
      </div>

      {/* Progress */}
      <GoalProgressBar
        percentage={goal.progressPercentage}
        color={goal.color}
      />

      {/* Amounts */}
      <div className="flex justify-between mt-3 mb-1">
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Saved</p>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">
            {formatCurrency(goal.currentAmount)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500 dark:text-gray-400">Goal</p>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">
            {formatCurrency(goal.targetAmount)}
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
          <Calendar size={12} />
          <span>{formatDate(goal.targetDate)}</span>
        </div>
        {goal.status === "active" && (
          <span
            className={`text-xs font-medium ${goal.daysRemaining < 30 ? "text-red-600 dark:text-red-400" : "text-gray-500 dark:text-gray-400"}`}
          >
            {goal.daysRemaining > 0
              ? `${goal.daysRemaining}d left`
              : "Past due"}
          </span>
        )}
        {goal.status === "completed" && goal.completedAt && (
          <span className="text-xs text-green-600 dark:text-green-400 font-medium">
            Done {formatDate(goal.completedAt)}
          </span>
        )}
      </div>
    </div>
  );
}
