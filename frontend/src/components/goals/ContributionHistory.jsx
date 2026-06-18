import React, { useState, useEffect } from "react";
import UndoIcon from "@mui/icons-material/Undo";
import LinkIcon from "@mui/icons-material/Link";
import EditIcon from "@mui/icons-material/Edit";

function inrFmt(amount) {
  return `₹${Number(amount ?? 0).toLocaleString("en-IN")}`;
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Single contribution row — dark-card list item, similar spacing/structure
 * to RecurringRow in Recurring.jsx, but lighter (no toggle, simpler actions).
 */
const ContributionRow = ({ contribution, onUndo, undoing }) => {
  const isLinked = contribution.source === "linked";
  const isUndone = contribution.isUndone;

  return (
    <div
      className={`flex items-center justify-between gap-3 py-3 border-b border-gray-100 dark:border-gray-700 last:border-0 ${
        isUndone ? "opacity-40" : ""
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <span
          className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
            isLinked
              ? "bg-blue-50 dark:bg-blue-900/20 text-blue-500"
              : "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500"
          }`}
          aria-hidden="true"
        >
          {isLinked ? (
            <LinkIcon sx={{ fontSize: 14 }} />
          ) : (
            <EditIcon sx={{ fontSize: 13 }} />
          )}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
            {contribution.note ||
              (isLinked ? "Linked transaction" : "Manual contribution")}
            {isUndone && (
              <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide text-red-400">
                Undone
              </span>
            )}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {formatDate(contribution.date)}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <span className="text-sm font-semibold tabular-nums text-green-600 dark:text-green-400">
          +{inrFmt(contribution.amount)}
        </span>
        {!isUndone && onUndo && (
          <button
            onClick={() => onUndo(contribution._id)}
            disabled={undoing}
            title="Undo this contribution"
            aria-label="Undo contribution"
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <UndoIcon sx={{ fontSize: 16 }} />
          </button>
        )}
      </div>
    </div>
  );
};

/**
 * ContributionHistory
 *
 * Paginated list of a goal's contributions. Designed to be embedded inside
 * GoalDetailPanel.jsx (passed contributions data via the useContributions hook).
 */
const ContributionHistory = ({
  contributions,
  loading,
  pagination,
  onLoadMore,
  onUndo,
  undoingId,
}) => {
  if (loading && contributions.length === 0) {
    return (
      <div className="space-y-2 py-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-1 animate-pulse">
            <div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-700" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
              <div className="h-2.5 bg-gray-100 dark:bg-gray-600 rounded w-1/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (contributions.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No contributions yet.
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
          Add your first contribution to start tracking progress.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="divide-y divide-gray-100 dark:divide-gray-700">
        {contributions.map((c) => (
          <ContributionRow
            key={c._id}
            contribution={c}
            onUndo={onUndo}
            undoing={undoingId === c._id}
          />
        ))}
      </div>

      {pagination?.hasNextPage && (
        <button
          onClick={onLoadMore}
          disabled={loading}
          className="w-full mt-3 py-2 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline disabled:opacity-50"
        >
          {loading ? "Loading…" : "Load more"}
        </button>
      )}
    </div>
  );
};

export default ContributionHistory;
