import React from "react";

const ConfidenceBadge = ({ confidence = 0 }) => {
  const color =
    confidence >= 0.75 ? "#4ade80" : confidence >= 0.4 ? "#facc15" : "#f87171";
  const label =
    confidence >= 0.75 ? "High" : confidence >= 0.4 ? "Medium" : "Low";
  const pct = Math.round(confidence * 100);

  return (
    <span
      className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0"
      style={{ color, background: `${color}18` }}
      title={`${pct}% confidence`}
    >
      {label} confidence
    </span>
  );
};

const ReceiptOCRPreview = ({ receipt, imageUrl }) => {
  if (!receipt) return null;

  const { merchant, amount, date, tax } = receipt.extracted ?? {};

  const rows = [
    { label: "Merchant", field: merchant, format: (v) => v || "—" },
    {
      label: "Total amount",
      field: amount,
      format: (v) =>
        v != null ? `₹${Number(v).toLocaleString("en-IN")}` : "—",
    },
    {
      label: "Date",
      field: date,
      format: (v) => (v ? new Date(v).toLocaleDateString("en-IN") : "—"),
    },
    {
      label: "Tax",
      field: tax,
      format: (v) =>
        v != null ? `₹${Number(v).toLocaleString("en-IN")}` : "—",
    },
  ];

  return (
    <div className="grid md:grid-cols-2 gap-5">
      {/* Image preview */}
      <div className="rounded-xl border border-[#27272a] overflow-hidden bg-[#0f0f11] flex items-center justify-center min-h-[280px]">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt="Uploaded receipt"
            className="max-h-[420px] w-full object-contain"
          />
        ) : (
          <p className="text-sm text-[#52525b] py-16">
            Receipt image preview unavailable.
          </p>
        )}
      </div>

      {/* Extracted fields summary */}
      <div className="space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#52525b]">
          Extracted from receipt
        </p>

        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between gap-3 px-4 py-3 rounded-lg border border-[#27272a] bg-[#18181b]"
          >
            <div className="min-w-0">
              <p className="text-[11px] text-[#52525b] uppercase tracking-wide mb-0.5">
                {row.label}
              </p>
              <p className="text-sm text-[#e4e4e7] font-medium truncate">
                {row.format(row.field?.value)}
              </p>
            </div>
            <ConfidenceBadge confidence={row.field?.confidence ?? 0} />
          </div>
        ))}

        {receipt.ocrConfidence != null && (
          <p className="text-[11px] text-[#3f3f46] pt-1">
            OCR engine: {receipt.ocrProvider} · overall confidence{" "}
            {Math.round(receipt.ocrConfidence)}%
          </p>
        )}

        <p className="text-[11px] text-[#52525b] italic pt-1">
          Low-confidence fields are worth double-checking below before
          confirming.
        </p>
      </div>
    </div>
  );
};

export default ReceiptOCRPreview;
