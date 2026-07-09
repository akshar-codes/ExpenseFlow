import React from "react";
import { IMPORT_FIELDS } from "../../constants/importSources";
import ImportPreviewTable from "./ImportPreviewTable";
import ValidationErrorsPanel from "./ValidationErrorsPanel";

const selectCls =
  "bg-[#0f0f11] border border-[#27272a] rounded-lg px-2.5 py-1.5 text-sm text-[#e4e4e7] focus:outline-none focus:ring-2 focus:ring-[#6366f1]/40 w-full";

const ColumnMappingStep = ({
  preview,
  columnMapping,
  onMappingChange,
  onRefresh,
  loading,
}) => {
  if (!preview) return null;

  const errorRows = preview.previewRows.filter((r) => !r.valid);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#52525b]">
            Column Mapping
          </p>
          <span className="text-[11px] text-[#52525b]">
            Auto-detect confidence:{" "}
            <span className="text-[#a5b4fc] font-semibold">
              {Math.round((preview.detectionScore ?? 0) * 100)}%
            </span>
          </span>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {IMPORT_FIELDS.map((field) => (
            <div key={field.value}>
              <label className="block text-[11px] text-[#71717a] mb-1">
                {field.label}
                {field.required && <span className="text-[#f87171]"> *</span>}
              </label>
              <select
                value={columnMapping?.[field.value] || ""}
                onChange={(e) => onMappingChange(field.value, e.target.value)}
                className={selectCls}
              >
                <option value="">— Not mapped —</option>
                {preview.headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>

        <div className="flex justify-end mt-3">
          <button
            onClick={onRefresh}
            disabled={loading}
            className="text-xs text-[#6366f1] hover:text-[#818cf8] transition-colors disabled:opacity-50"
          >
            {loading ? "Refreshing…" : "Refresh preview with this mapping →"}
          </button>
        </div>
      </div>

      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#52525b] mb-3">
          Preview ({preview.previewRows.length} of {preview.totalRows} rows)
        </p>
        <ImportPreviewTable rows={preview.previewRows} />
      </div>

      {errorRows.length > 0 && (
        <ValidationErrorsPanel errors={errorRows.flatMap((r) => r.errors)} />
      )}
    </div>
  );
};

export default ColumnMappingStep;
