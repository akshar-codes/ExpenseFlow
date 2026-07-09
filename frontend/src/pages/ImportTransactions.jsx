import React from "react";
import useFonts from "../hooks/useFonts";
import useImportFlow from "../hooks/useImportFlow";
import ImportDropzone from "../components/import/ImportDropzone";
import ColumnMappingStep from "../components/import/ColumnMappingStep";
import ImportProgress from "../components/import/ImportProgress";
import ImportSummary from "../components/import/ImportSummary";

const ImportTransactions = () => {
  useFonts();

  const {
    IMPORT_STEPS,
    step,
    preview,
    columnMapping,
    skipDuplicates,
    setSkipDuplicates,
    progressStage,
    summary,
    error,
    loading,
    handleFileSelected,
    updateMapping,
    refreshPreviewWithMapping,
    runImport,
    rollback,
    reset,
  } = useImportFlow();

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
            background: "radial-gradient(circle,#6366f1 0%,transparent 70%)",
            filter: "blur(64px)",
          }}
        />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-6 md:px-8 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-white">
            Import Transactions
          </h1>
          <p className="text-sm text-[#52525b] mt-1">
            Bulk-import transactions from bank statements or UPI apps.
          </p>
        </div>

        {error && (
          <div className="px-4 py-3 rounded-xl border border-[#f87171]/20 bg-[#f87171]/8 text-sm text-[#f87171]">
            {error}
          </div>
        )}

        <div
          className="rounded-2xl border border-[#27272a] p-6"
          style={{
            background: "linear-gradient(145deg, #18181b 0%, #141416 100%)",
          }}
        >
          {step === IMPORT_STEPS.SELECT && (
            <ImportDropzone
              onFileSelected={handleFileSelected}
              loading={loading}
            />
          )}

          {step === IMPORT_STEPS.MAPPING && preview && (
            <div className="space-y-6">
              <ColumnMappingStep
                preview={preview}
                columnMapping={columnMapping}
                onMappingChange={updateMapping}
                onRefresh={refreshPreviewWithMapping}
                loading={loading}
              />

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 border-t border-[#27272a]">
                <label className="flex items-center gap-2 text-sm text-[#a1a1aa]">
                  <input
                    type="checkbox"
                    checked={skipDuplicates}
                    onChange={(e) => setSkipDuplicates(e.target.checked)}
                  />
                  Skip duplicate transactions automatically
                </label>

                <div className="flex gap-2">
                  <button
                    onClick={reset}
                    className="px-4 py-2 rounded-lg border border-[#27272a] text-sm text-[#a1a1aa] hover:border-[#3f3f46]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={runImport}
                    disabled={loading}
                    className="px-5 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
                    style={{
                      background: "linear-gradient(135deg, #6366f1, #4f46e5)",
                    }}
                  >
                    Import {preview.totalRows} transactions
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === IMPORT_STEPS.IMPORTING && (
            <ImportProgress stage={progressStage} />
          )}

          {step === IMPORT_STEPS.SUMMARY && (
            <ImportSummary
              summary={summary}
              onRollback={rollback}
              onStartNew={reset}
              loading={loading}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default ImportTransactions;
