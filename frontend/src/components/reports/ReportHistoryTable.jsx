import React, { useState } from "react";
import { REPORT_STATUS } from "../../constants/reportTypes";
import DeleteConfirm from "../DeleteConfirm";
import EmailReportModal from "./EmailReportModal";

const STATUS_CONFIG = {
  [REPORT_STATUS.COMPLETED]: {
    label: "Completed",
    color: "#4ade80",
    bg: "rgba(74,222,128,0.10)",
  },
  [REPORT_STATUS.GENERATING]: {
    label: "Generating",
    color: "#facc15",
    bg: "rgba(250,204,21,0.10)",
  },
  [REPORT_STATUS.FAILED]: {
    label: "Failed",
    color: "#f87171",
    bg: "rgba(248,113,113,0.10)",
  },
};

const formatSize = (bytes) => {
  if (!bytes) return "—";
  const kb = bytes / 1024;
  return kb > 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${Math.round(kb)} KB`;
};

const periodLabel = (report) =>
  report.type === "monthly"
    ? new Date(report.year, report.month - 1).toLocaleDateString("en-IN", {
        month: "long",
        year: "numeric",
      })
    : `${new Date(report.startDate).toLocaleDateString("en-IN")} – ${new Date(
        report.endDate,
      ).toLocaleDateString("en-IN")}`;

const ReportHistoryTable = ({ reports, onDownload, onEmail, onDelete }) => {
  const [emailTarget, setEmailTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [busyId, setBusyId] = useState(null);

  if (!reports.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center gap-2">
        <span className="text-4xl opacity-20">📄</span>
        <p className="text-sm text-[#a1a1aa]">No reports generated yet.</p>
        <p className="text-xs text-[#52525b]">
          Click "Generate Report" to create your first financial PDF report.
        </p>
      </div>
    );
  }

  const handleDownload = async (report) => {
    setBusyId(report._id);
    try {
      await onDownload(report);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <div
        className="rounded-xl border border-[#27272a] overflow-hidden"
        style={{
          background: "linear-gradient(145deg, #18181b 0%, #141416 100%)",
        }}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse">
            <thead>
              <tr className="border-b border-[#27272a] bg-[#0f0f11]/60">
                {["Type", "Period", "Status", "Size", "Generated", ""].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-[#52525b]"
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {reports.map((r, idx) => {
                const cfg = STATUS_CONFIG[r.status] ?? STATUS_CONFIG.generating;
                return (
                  <tr
                    key={r._id}
                    className={`border-b border-[#27272a]/40 last:border-0 ${
                      idx % 2 !== 0 ? "bg-white/[0.01]" : ""
                    }`}
                  >
                    <td className="px-4 py-3 text-sm text-[#e4e4e7] capitalize">
                      {r.type}
                    </td>
                    <td className="px-4 py-3 text-sm text-[#a1a1aa]">
                      {periodLabel(r)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full"
                        style={{ color: cfg.color, background: cfg.bg }}
                      >
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-[#71717a] tabular-nums">
                      {formatSize(r.fileSizeBytes)}
                    </td>
                    <td className="px-4 py-3 text-xs text-[#71717a]">
                      {r.generatedAt
                        ? new Date(r.generatedAt).toLocaleString("en-IN")
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {r.status === REPORT_STATUS.COMPLETED && (
                          <>
                            <button
                              onClick={() => handleDownload(r)}
                              disabled={busyId === r._id}
                              className="text-[11px] text-[#a1a1aa] hover:text-[#6366f1] px-2 py-1 rounded hover:bg-[#6366f1]/10 disabled:opacity-50"
                            >
                              {busyId === r._id ? "…" : "Download"}
                            </button>
                            <button
                              onClick={() => setEmailTarget(r)}
                              className="text-[11px] text-[#a1a1aa] hover:text-[#6366f1] px-2 py-1 rounded hover:bg-[#6366f1]/10"
                            >
                              Email
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => setDeleteTarget(r)}
                          className="text-[11px] text-[#a1a1aa] hover:text-[#f87171] px-2 py-1 rounded hover:bg-[#f87171]/10"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {emailTarget && (
        <EmailReportModal
          report={emailTarget}
          onClose={() => setEmailTarget(null)}
          onSend={onEmail}
        />
      )}

      {deleteTarget && (
        <DeleteConfirm
          title="Delete report?"
          name={`${deleteTarget.type} report — ${periodLabel(deleteTarget)}`}
          onConfirm={async () => {
            await onDelete(deleteTarget._id);
            setDeleteTarget(null);
          }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </>
  );
};

export default ReportHistoryTable;
