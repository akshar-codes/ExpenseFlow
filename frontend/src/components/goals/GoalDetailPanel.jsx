import React, { useState, useEffect, useCallback } from "react";
import CloseIcon from "@mui/icons-material/Close";
import TrackChangesIcon from "@mui/icons-material/TrackChanges";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import ScheduleIcon from "@mui/icons-material/Schedule";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import EditIcon from "@mui/icons-material/Edit";
import AddIcon from "@mui/icons-material/Add";
import HistoryIcon from "@mui/icons-material/History";
import TimelineIcon from "@mui/icons-material/Timeline";
import { AnimatedGoalProgressBar } from "./AnimatedGoalProgressBar";
import ContributionModal from "./ContributionModal";
import ContributionHistory from "./ContributionHistory";
import GoalTimeline from "./GoalTimeline";
import { useContributions } from "../../hooks/useContributions";

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount ?? 0);
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

const STATUS_COLORS = {
  active: "text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-300",
  completed:
    "text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-300",
  paused:
    "text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 dark:text-yellow-300",
  cancelled: "text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-300",
};

function StatCard({ icon: Icon, label, value, subValue, accent }) {
  return (
    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon sx={{ fontSize: 15 }} className={accent || "text-gray-400"} />
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          {label}
        </span>
      </div>
      <p className="text-lg font-bold text-gray-900 dark:text-white">{value}</p>
      {subValue && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          {subValue}
        </p>
      )}
    </div>
  );
}

const TABS = [
  { value: "history", label: "History", icon: HistoryIcon },
  { value: "timeline", label: "Timeline", icon: TimelineIcon },
];

/**
 * GoalDetailPanel
 *
 * Existing modal preserved: header, status badges, stat grid, completion
 * info, created/updated footer. Added:
 *  - "Add contribution" button in the header actions
 *  - Tabbed History / Timeline section below the progress bar
 *  - Live-updating progress bar (AnimatedGoalProgressBar) and goal stats
 *    whenever a contribution is added or undone, without closing the panel.
 */
export function GoalDetailPanel({ goal: initialGoal, onClose, onEdit }) {
  const [goal, setGoal] = useState(initialGoal);
  const [showContributionModal, setShowContributionModal] = useState(false);
  const [activeTab, setActiveTab] = useState("history");

  useEffect(() => setGoal(initialGoal), [initialGoal]);

  const {
    contributions,
    pagination,
    loading,
    undoingId,
    error,
    fetchHistory,
    addManual,
    linkTransaction,
    undo,
  } = useContributions(goal?._id);

  useEffect(() => {
    if (goal?._id) fetchHistory({ page: 1, includeUndone: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goal?._id]);

  const handleLoadMore = useCallback(() => {
    const nextPage = (pagination?.page ?? 1) + 1;
    fetchHistory({ page: nextPage, includeUndone: true });
  }, [pagination, fetchHistory]);

  const handleAddContribution = async (payload) => {
    const result = await addManual(payload);
    setGoal(result.goal);
  };

  const handleLinkTransaction = async (payload) => {
    const result = await linkTransaction(payload);
    setGoal(result.goal);
  };

  const handleUndo = async (contributionId) => {
    const result = await undo(contributionId);
    setGoal(result.goal);
  };

  if (!goal) return null;

  const statusColorClass = STATUS_COLORS[goal.status] ?? STATUS_COLORS.active;

  const daysInfo = () => {
    if (goal.status === "completed") return "Goal reached!";
    if (goal.daysRemaining < 0)
      return `${Math.abs(goal.daysRemaining)} days overdue`;
    if (goal.daysRemaining === 0) return "Due today";
    return `${goal.daysRemaining} days remaining`;
  };

  // Only non-undone contributions feed the running-total timeline; the
  // history tab shows everything (including undone, for the audit trail).
  const activeContributions = contributions.filter((c) => !c.isUndone);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="goal-detail-title"
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Colorful header */}
        <div
          className="p-6 rounded-t-2xl"
          style={{
            background: `linear-gradient(135deg, ${goal.color}15, ${goal.color}30)`,
          }}
        >
          <div className="flex items-start justify-between mb-4">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: goal.color }}
            >
              <TrackChangesIcon
                sx={{
                  fontSize: 22,
                  color: "#fff",
                }}
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                className="p-1.5 rounded-lg bg-white/70 dark:bg-gray-800/70 hover:bg-white dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
                onClick={() => onEdit?.(goal)}
                aria-label="Edit goal"
              >
                <EditIcon sx={{ fontSize: 15 }} />
              </button>
              <button
                className="p-1.5 rounded-lg bg-white/70 dark:bg-gray-800/70 hover:bg-white dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
                onClick={onClose}
                aria-label="Close"
              >
                <CloseIcon sx={{ fontSize: 15 }} />
              </button>
            </div>
          </div>

          <h2
            id="goal-detail-title"
            className="text-xl font-bold text-gray-900 dark:text-white mb-1"
          >
            {goal.title}
          </h2>
          {goal.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {goal.description}
            </p>
          )}

          <div className="flex items-center gap-2 mt-3">
            <span
              className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${statusColorClass}`}
            >
              {goal.status}
            </span>
            {goal.category && (
              <span className="text-xs px-2.5 py-1 rounded-full bg-white/60 dark:bg-gray-800/60 text-gray-600 dark:text-gray-400">
                {goal.category}
              </span>
            )}
            {goal.isOverdue && (
              <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-red-100 text-red-700">
                <WarningAmberIcon sx={{ fontSize: 10 }} /> Overdue
              </span>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Progress */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Progress
              </span>
              <span
                className="text-sm font-bold"
                style={{
                  color: goal.status === "completed" ? "#22c55e" : goal.color,
                }}
              >
                {goal.progressPercentage?.toFixed(1)}%
              </span>
            </div>
            <AnimatedGoalProgressBar
              percentage={goal.progressPercentage}
              color={goal.color}
              showLabel={false}
              size="lg"
            />
          </div>

          {/* Add contribution CTA */}
          {goal.status !== "cancelled" && (
            <button
              onClick={() => setShowContributionModal(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium text-white transition-all hover:opacity-90"
              style={{ backgroundColor: goal.color }}
            >
              <AddIcon sx={{ fontSize: 16 }} />
              Add Contribution
            </button>
          )}

          {/* Stat grid */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              icon={AttachMoneyIcon}
              label="Saved"
              value={formatCurrency(goal.currentAmount)}
              subValue={`of ${formatCurrency(goal.targetAmount)}`}
              accent="text-green-500"
            />
            <StatCard
              icon={TrendingUpIcon}
              label="Remaining"
              value={formatCurrency(goal.remainingAmount)}
              subValue="to reach goal"
              accent="text-indigo-500"
            />
            <StatCard
              icon={CalendarTodayIcon}
              label="Target Date"
              value={formatDate(goal.targetDate)}
              subValue={daysInfo()}
              accent={goal.isOverdue ? "text-red-500" : "text-blue-500"}
            />
            <StatCard
              icon={ScheduleIcon}
              label="Priority"
              value={
                goal.priority
                  ? goal.priority.charAt(0).toUpperCase() +
                    goal.priority.slice(1)
                  : "—"
              }
              subValue="goal priority"
              accent="text-yellow-500"
            />
          </div>

          {/* Completion info */}
          {goal.status === "completed" && goal.completedAt && (
            <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-xl">
              <CheckCircleIcon
                sx={{ fontSize: 20 }}
                className="text-green-500 flex-shrink-0"
              />
              <div>
                <p className="text-sm font-semibold text-green-800 dark:text-green-300">
                  Goal Achieved!
                </p>
                <p className="text-xs text-green-600 dark:text-green-400">
                  Completed on {formatDate(goal.completedAt)}
                </p>
              </div>
            </div>
          )}

          {/* Contributions: History / Timeline tabs */}
          <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-1 mb-3">
              {TABS.map((tab) => {
                const TabIcon = tab.icon;
                const active = activeTab === tab.value;
                return (
                  <button
                    key={tab.value}
                    onClick={() => setActiveTab(tab.value)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      active
                        ? "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-300"
                        : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                    }`}
                  >
                    <TabIcon sx={{ fontSize: 13 }} />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {error && (
              <p className="text-xs text-red-500 mb-2" role="alert">
                {error}
              </p>
            )}

            {activeTab === "history" ? (
              <ContributionHistory
                contributions={contributions}
                loading={loading}
                pagination={pagination}
                onLoadMore={handleLoadMore}
                onUndo={handleUndo}
                undoingId={undoingId}
              />
            ) : (
              <GoalTimeline
                contributions={activeContributions}
                targetAmount={goal.targetAmount}
                color={goal.color}
              />
            )}
          </div>

          {/* Created / updated */}
          <div className="text-xs text-gray-400 dark:text-gray-500 space-y-0.5">
            <p>Created: {formatDate(goal.createdAt)}</p>
            {goal.updatedAt !== goal.createdAt && (
              <p>Last updated: {formatDate(goal.updatedAt)}</p>
            )}
          </div>
        </div>
      </div>

      {showContributionModal && (
        <ContributionModal
          goal={goal}
          onClose={() => setShowContributionModal(false)}
          onAdd={handleAddContribution}
          onLink={handleLinkTransaction}
        />
      )}
    </div>
  );
}
