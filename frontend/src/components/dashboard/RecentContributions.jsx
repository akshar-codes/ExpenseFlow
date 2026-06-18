import React from "react";

const inrFmt = (v) => `₹${Number(v).toLocaleString("en-IN")}`;

const formatRecentDate = (dateInput) => {
  const d = new Date(dateInput);
  const now = new Date();
  const sameDay = (a, b) =>
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate();

  if (sameDay(d, now)) return "Today";

  const yesterday = new Date(now);
  yesterday.setUTCDate(now.getUTCDate() - 1);
  if (sameDay(d, yesterday)) return "Yesterday";

  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
};

const ContributionRow = ({ contribution }) => {
  const goalTitle = contribution.goal?.title || "Goal";
  const goalColor = contribution.goal?.color || "#6366f1";

  return (
    <div className="flex items-center justify-between py-2.5 border-b border-[#27272a]/50 last:border-0">
      <div className="flex items-center gap-3 min-w-0">
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{ background: goalColor }}
        />
        <div className="min-w-0">
          <p
            className="text-sm text-[#e4e4e7] font-medium truncate"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            {goalTitle}
          </p>
          {contribution.note && (
            <p
              className="text-[11px] text-[#52525b] truncate max-w-[180px]"
              style={{ fontFamily: "'Sora', sans-serif" }}
            >
              {contribution.note}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-4 shrink-0 ml-3">
        <span
          className="text-[11px] text-[#52525b]"
          style={{ fontFamily: "'Sora', sans-serif" }}
        >
          {formatRecentDate(contribution.date)}
        </span>
        <span
          className="text-sm font-semibold tabular-nums text-[#4ade80]"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          +{inrFmt(contribution.amount)}
        </span>
      </div>
    </div>
  );
};

/**
 * RecentContributions
 *
 * Dashboard card mirroring the "Recent Activity" panel in Dashboard.jsx —
 * same header/footer structure, same dark gradient card, same row layout.
 */
const RecentContributions = ({ contributions, loading, onAddClick }) => (
  <div
    className="rounded-xl border border-[#27272a] overflow-hidden flex-1"
    style={{
      background: "linear-gradient(145deg, #18181b 0%, #141416 100%)",
    }}
  >
    <div className="px-5 pt-5 pb-4 border-b border-[#27272a]/60 flex items-center justify-between">
      <p
        className="text-sm font-semibold text-[#e4e4e7]"
        style={{ fontFamily: "'Sora', sans-serif" }}
      >
        Recent Contributions
      </p>
    </div>
    <div className="px-5 py-3">
      {loading ? (
        <div className="py-10 flex justify-center">
          <div className="w-5 h-5 border-2 border-[#6366f1] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : contributions.length === 0 ? (
        <div className="py-10 flex flex-col items-center gap-2 text-center">
          <span className="text-3xl opacity-20">🎯</span>
          <p className="text-sm text-[#52525b]">No contributions yet</p>
          {onAddClick && (
            <button
              onClick={onAddClick}
              className="mt-2 text-xs text-[#6366f1] hover:text-[#818cf8] transition-colors"
            >
              Start saving toward a goal →
            </button>
          )}
        </div>
      ) : (
        contributions.map((c) => (
          <ContributionRow key={c._id} contribution={c} />
        ))
      )}
    </div>
  </div>
);

export default RecentContributions;
