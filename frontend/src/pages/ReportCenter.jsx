import React, { useState } from "react";
import useReports from "../hooks/useReports";
import useFonts from "../hooks/useFonts";
import GenerateReportModal from "../components/reports/GenerateReportModal";
import ReportHistoryTable from "../components/reports/ReportHistoryTable";

const ReportCenter = () => {
  useFonts();
  const {
    reports,
    loading,
    generating,
    error,
    setError,
    generate,
    download,
    emailIt,
    remove,
  } = useReports();
  const [showModal, setShowModal] = useState(false);

  return (
    <div
      className="min-h-screen bg-[#0a0a0c] text-[#e4e4e7]"
      style={{ fontFamily: "'Sora', sans-serif" }}
    >
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 overflow-hidden z-0"
      >
        <div
          className="absolute -top-24 -right-24 w-[480px] h-[480px] rounded-full opacity-[0.05]"
          style={{
            background: "radial-gradient(circle, #6366f1 0%, transparent 70%)",
            filter: "blur(64px)",
          }}
        />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6 md:px-8 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-white">Report Center</h1>
            <p className="text-sm text-[#52525b] mt-1">
              Generate, download, and email detailed PDF financial reports.
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white shrink-0"
            style={{
              background: "linear-gradient(135deg, #6366f1, #4f46e5)",
              boxShadow: "0 2px 12px rgba(99,102,241,0.3)",
            }}
          >
            <span className="text-base leading-none">+</span>
            Generate Report
          </button>
        </div>

        {error && (
          <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-[#f87171]/20 bg-[#f87171]/8">
            <p className="text-sm text-[#f87171]">{error}</p>
            <button
              onClick={() => setError("")}
              className="text-[#f87171]/60 hover:text-[#f87171] text-xs shrink-0"
              aria-label="Dismiss error"
            >
              ✕
            </button>
          </div>
        )}

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#52525b] mb-3">
            Download History
          </p>
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <div className="w-6 h-6 border-[3px] border-[#6366f1] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <ReportHistoryTable
              reports={reports}
              onDownload={download}
              onEmail={emailIt}
              onDelete={remove}
            />
          )}
        </div>
      </div>

      {showModal && (
        <GenerateReportModal
          onClose={() => setShowModal(false)}
          onGenerate={generate}
          generating={generating}
        />
      )}
    </div>
  );
};

export default ReportCenter;
