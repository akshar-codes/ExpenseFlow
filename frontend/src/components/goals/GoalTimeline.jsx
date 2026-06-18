import React, { useMemo } from "react";

function inrFmt(amount) {
  return `₹${Number(amount ?? 0).toLocaleString("en-IN")}`;
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

/**
 * GoalTimeline
 *
 * A vertical timeline of contribution events plotted against the goal's
 * cumulative progress. Built from the same `contributions` array used by
 * ContributionHistory, but visualized as a running total rather than a list.
 *
 * Only active (non-undone) contributions are plotted; undone entries are
 * shown as faded "reversed" markers so the audit trail stays visible.
 */
const GoalTimeline = ({ contributions, targetAmount, color = "#6366f1" }) => {
  const events = useMemo(() => {
    // Sort ascending by date so the running total accumulates correctly
    const sorted = [...contributions].sort(
      (a, b) => new Date(a.date) - new Date(b.date),
    );

    let running = 0;
    return sorted.map((c) => {
      if (!c.isUndone) running += c.amount;
      const pct =
        targetAmount > 0 ? Math.min((running / targetAmount) * 100, 100) : 0;
      return { ...c, runningTotal: running, pct };
    });
  }, [contributions, targetAmount]);

  if (events.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          The timeline will appear once you add a contribution.
        </p>
      </div>
    );
  }

  return (
    <div className="relative pl-5">
      {/* Vertical track */}
      <div
        className="absolute left-[7px] top-1 bottom-1 w-px"
        style={{ background: "rgba(127,127,127,0.25)" }}
        aria-hidden="true"
      />

      <div className="space-y-4">
        {events.map((e) => (
          <div key={e._id} className="relative">
            {/* Node */}
            <span
              className={`absolute -left-5 top-1 w-3 h-3 rounded-full border-2 ${
                e.isUndone ? "opacity-40" : ""
              }`}
              style={{
                borderColor: e.isUndone ? "#71717a" : color,
                background: e.isUndone ? "transparent" : color,
              }}
              aria-hidden="true"
            />

            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p
                  className={`text-sm font-medium text-gray-900 dark:text-white truncate ${
                    e.isUndone ? "line-through opacity-50" : ""
                  }`}
                >
                  {e.note ||
                    (e.source === "linked"
                      ? "Linked transaction"
                      : "Manual contribution")}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {formatDate(e.date)}
                  {e.isUndone ? " · reversed" : ""}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p
                  className={`text-sm font-semibold tabular-nums ${
                    e.isUndone
                      ? "text-gray-400 line-through"
                      : "text-green-600 dark:text-green-400"
                  }`}
                >
                  +{inrFmt(e.amount)}
                </p>
                {!e.isUndone && (
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 tabular-nums">
                    {inrFmt(e.runningTotal)} total
                  </p>
                )}
              </div>
            </div>

            {/* Mini progress sliver under each non-undone event */}
            {!e.isUndone && (
              <div className="mt-1.5 h-1 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${e.pct}%`, background: color }}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default GoalTimeline;
