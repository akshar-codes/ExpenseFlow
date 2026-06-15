import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Target,
  TrendingUp,
  CheckCircle,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import { useGoals } from "../../hooks/useGoals";
import { GoalProgressBar } from "./GoalProgressBar";

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount ?? 0);
}

function ActiveGoalRow({ goal }) {
  return (
    <div className="py-3 first:pt-0 last:pb-0">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: goal.color }}
            aria-hidden="true"
          />
          <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
            {goal.title}
          </span>
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0 ml-2">
          {formatCurrency(goal.currentAmount)} /{" "}
          {formatCurrency(goal.targetAmount)}
        </span>
      </div>
      <GoalProgressBar
        percentage={goal.progressPercentage}
        color={goal.color}
        showLabel={false}
        size="sm"
      />
      <div className="flex justify-between mt-1">
        <span className="text-xs text-gray-400">
          {goal.progressPercentage?.toFixed(0)}%
        </span>
        <span
          className={`text-xs ${goal.daysRemaining < 30 ? "text-red-500" : "text-gray-400"}`}
        >
          {goal.daysRemaining > 0 ? `${goal.daysRemaining}d left` : "Past due"}
        </span>
      </div>
    </div>
  );
}

function CompletedGoalRow({ goal }) {
  return (
    <div className="flex items-center gap-3 py-2 first:pt-0 last:pb-0">
      <CheckCircle size={16} className="text-green-500 flex-shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
          {goal.title}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {formatCurrency(goal.targetAmount)}
        </p>
      </div>
      <span className="text-xs font-medium text-green-600 dark:text-green-400 flex-shrink-0">
        Done ✓
      </span>
    </div>
  );
}

export function GoalDashboardWidget() {
  const { fetchDashboard } = useGoals();
  const [data, setData] = useState(null);
  const [loadingWidget, setLoadingWidget] = useState(true);
  const [widgetError, setWidgetError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const result = await fetchDashboard();
        if (!cancelled) setData(result);
      } catch (err) {
        if (!cancelled) setWidgetError(err.message);
      } finally {
        if (!cancelled) setLoadingWidget(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [fetchDashboard]);

  if (loadingWidget) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 animate-pulse">
        <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="h-10 bg-gray-100 dark:bg-gray-700 rounded mb-2"
          />
        ))}
      </div>
    );
  }

  if (widgetError) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <div className="flex items-center gap-2 text-red-500">
          <AlertCircle size={16} />
          <span className="text-sm">Failed to load goals</span>
        </div>
      </div>
    );
  }

  const { activeGoals = [], recentlyCompleted = [], statistics } = data ?? {};
  const overallProgress = statistics?.overall?.overallProgress ?? 0;
  const totalTarget = statistics?.overall?.totalTarget ?? 0;
  const totalCurrent = statistics?.overall?.totalCurrent ?? 0;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Widget Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <Target size={18} className="text-indigo-500" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            Financial Goals
          </h3>
        </div>
        <Link
          to="/goals"
          className="flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          View all <ChevronRight size={12} />
        </Link>
      </div>

      {/* Overall savings progress */}
      {totalTarget > 0 && (
        <div className="px-5 py-4 bg-indigo-50 dark:bg-indigo-900/10 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 uppercase tracking-wide">
              Overall Savings Progress
            </span>
            <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300">
              {overallProgress.toFixed(1)}%
            </span>
          </div>
          <GoalProgressBar
            percentage={overallProgress}
            color="#6366f1"
            showLabel={false}
            size="md"
          />
          <div className="flex justify-between mt-1.5 text-xs text-indigo-600 dark:text-indigo-400">
            <span>{formatCurrency(totalCurrent)} saved</span>
            <span>{formatCurrency(totalTarget)} total goal</span>
          </div>
        </div>
      )}

      <div className="px-5 py-4">
        {/* Active Goals */}
        {activeGoals.length > 0 ? (
          <div>
            <div className="flex items-center gap-1.5 mb-3">
              <TrendingUp size={13} className="text-blue-500" />
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Active Goals
              </span>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {activeGoals.map((g) => (
                <ActiveGoalRow key={g._id} goal={g} />
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <Target
              size={28}
              className="text-gray-300 dark:text-gray-600 mx-auto mb-2"
            />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No active goals
            </p>
            <Link
              to="/goals"
              className="mt-2 inline-block text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Create your first goal →
            </Link>
          </div>
        )}

        {/* Recently Completed */}
        {recentlyCompleted.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-1.5 mb-3">
              <CheckCircle size={13} className="text-green-500" />
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Recently Completed
              </span>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {recentlyCompleted.map((g) => (
                <CompletedGoalRow key={g._id} goal={g} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
