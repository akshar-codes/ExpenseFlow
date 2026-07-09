import React from "react";

const StatBlock = ({ label, value, color }) => (
  <div className="rounded-xl border border-[#27272a] px-4 py-3">
    <p className="text-[11px] text-[#52525b] uppercase tracking-wider mb-1">
      {label}
    </p>
    <p
      className="text-xl font-semibold tabular-nums"
      style={{ fontFamily: "'JetBrains Mono', monospace", color }}
    >
      {value}
    </p>
  </div>
);

const ImportSummary = ({ summary, onRollback, onStartNew, loading }) => {
  if (!summary) return null;

  const isRolledBack = summary.status === "rolled_back";

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatBlock
          label="Imported"
          value={summary.importedCount}
          color="#4ade80"
        />
        <StatBlock
          label="Duplicates skipped"
          value={summary.duplicateCount}
          color="#facc15"
        />
        <StatBlock label="Errors" value={summary.errorCount} color="#f87171" />
        <StatBlock
          label="Auto-categorized"
          value={summary.categoryAutoAssignedCount}
          color="#a5b4fc"
        />
      </div>

      {summary.errors?.length > 0 && (
        <div className="rounded-xl border border-[#27272a] px-4 py-3 max-h-48 overflow-y-auto">
          <p className="text-xs font-semibold text-[#71717a] mb-2">
            Error details
          </p>
          <ul className="space-y-1">
            {summary.errors.map((err, idx) => (
              <li key={idx} className="text-xs text-[#f87171]/80">
                {err}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-center gap-3">
        {!isRolledBack ? (
          <button
            onClick={onRollback}
            disabled={loading}
            className="px-4 py-2 rounded-lg border border-[#f87171]/30 bg-[#f87171]/10 text-sm text-[#f87171] hover:bg-[#f87171]/20 transition-all disabled:opacity-50"
          >
            {loading ? "Rolling back…" : "Undo this import"}
          </button>
        ) : (
          <span className="text-sm text-[#facc15]">
            This import has been rolled back.
          </span>
        )}
        <button
          onClick={onStartNew}
          className="px-4 py-2 rounded-lg text-sm font-medium text-white"
          style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)" }}
        >
          Import another file
        </button>
      </div>
    </div>
  );
};

export default ImportSummary;
