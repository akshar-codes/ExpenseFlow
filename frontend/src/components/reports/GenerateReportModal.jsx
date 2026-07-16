import React, { useState } from "react";
import {
  REPORT_TYPES,
  REPORT_SECTIONS,
  DEFAULT_SECTIONS,
} from "../../constants/reportTypes";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 6 }, (_, i) => CURRENT_YEAR - i);
const TODAY = new Date().toISOString().slice(0, 10);

const inputCls = [
  "w-full bg-[#0f0f11] border border-[#27272a] rounded-lg px-3 py-2",
  "text-sm text-[#e4e4e7] placeholder:text-[#52525b]",
  "focus:outline-none focus:ring-2 focus:ring-[#6366f1]/50 focus:border-[#6366f1]/60",
  "transition-all duration-150",
].join(" ");

const labelCls =
  "block text-[11px] font-semibold uppercase tracking-[0.1em] text-[#52525b] mb-1.5";

const GenerateReportModal = ({ onClose, onGenerate, generating }) => {
  const [type, setType] = useState(REPORT_TYPES.MONTHLY);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(CURRENT_YEAR);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sections, setSections] = useState(DEFAULT_SECTIONS);
  const [error, setError] = useState("");

  const toggleSection = (value) => {
    setSections((prev) =>
      prev.includes(value) ? prev.filter((s) => s !== value) : [...prev, value],
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (type === REPORT_TYPES.CUSTOM) {
      if (!startDate || !endDate)
        return setError("Please select both a start and end date.");
      if (startDate > endDate)
        return setError("Start date must be before the end date.");
    }

    const payload =
      type === REPORT_TYPES.MONTHLY
        ? { type, month: Number(month), year: Number(year), sections }
        : { type, startDate, endDate, sections };

    try {
      await onGenerate(payload);
      onClose();
    } catch (err) {
      setError(err.message || "Failed to generate report.");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-[#18181b] w-full max-w-lg rounded-2xl p-6 border border-[#27272a] max-h-[90vh] overflow-y-auto"
        style={{ fontFamily: "'Sora', sans-serif" }}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-[#e4e4e7]">
            Generate Report
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-[#52525b] hover:text-[#a1a1aa]"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {error && (
          <p className="text-sm text-[#f87171] bg-[#f87171]/10 border border-[#f87171]/20 px-3 py-2 rounded-lg mb-4">
            {error}
          </p>
        )}

        {/* Type toggle */}
        <div className="mb-4">
          <span className={labelCls}>Report Type</span>
          <div
            className="flex rounded-lg border border-[#27272a] overflow-hidden"
            style={{ background: "#0f0f11" }}
          >
            {[
              { value: REPORT_TYPES.MONTHLY, label: "Monthly" },
              { value: REPORT_TYPES.CUSTOM, label: "Custom Date Range" },
            ].map((opt) => {
              const active = type === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setType(opt.value)}
                  className="flex-1 py-2 text-xs font-medium transition-all duration-150"
                  style={{
                    background: active
                      ? "rgba(99,102,241,0.12)"
                      : "transparent",
                    color: active ? "#a5b4fc" : "#71717a",
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Period selectors */}
        {type === REPORT_TYPES.MONTHLY ? (
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className={labelCls}>Month</label>
              <select
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className={inputCls}
              >
                {MONTHS.map((m, i) => (
                  <option key={m} value={i + 1}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Year</label>
              <select
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className={inputCls}
              >
                {YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className={labelCls}>Start Date</label>
              <input
                type="date"
                value={startDate}
                max={endDate || TODAY}
                onChange={(e) => setStartDate(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>End Date</label>
              <input
                type="date"
                value={endDate}
                min={startDate || undefined}
                max={TODAY}
                onChange={(e) => setEndDate(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>
        )}

        {/* Sections */}
        <div className="mb-5">
          <span className={labelCls}>Sections to Include</span>
          <div className="grid grid-cols-2 gap-2">
            {REPORT_SECTIONS.map((s) => (
              <label
                key={s.value}
                className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg border cursor-pointer ${
                  sections.includes(s.value)
                    ? "border-[#6366f1]/40 bg-[#6366f1]/10 text-[#a5b4fc]"
                    : "border-[#27272a] text-[#71717a]"
                } ${s.locked ? "opacity-60 cursor-not-allowed" : ""}`}
              >
                <input
                  type="checkbox"
                  checked={sections.includes(s.value)}
                  disabled={s.locked}
                  onChange={() => toggleSection(s.value)}
                  className="accent-[#6366f1]"
                />
                {s.label}
              </label>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={generating}
            className="px-4 py-2 rounded-lg border border-[#27272a] text-sm text-[#a1a1aa] hover:border-[#3f3f46] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={generating}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)" }}
          >
            {generating ? "Generating…" : "Generate Report"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default GenerateReportModal;
