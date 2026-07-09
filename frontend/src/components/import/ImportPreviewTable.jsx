import React from "react";

const inrFmt = (v) =>
  v != null ? `₹${Number(v).toLocaleString("en-IN")}` : "—";

const ImportPreviewTable = ({ rows }) => (
  <div className="rounded-xl border border-[#27272a] overflow-hidden">
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] border-collapse">
        <thead>
          <tr className="border-b border-[#27272a] bg-[#0f0f11]">
            {["#", "Date", "Description", "Amount", "Type", "Status"].map(
              (h) => (
                <th
                  key={h}
                  className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-[#71717a]"
                >
                  {h}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.rowNumber}
              className={`border-b border-[#27272a]/40 last:border-0 ${
                row.valid ? "" : "bg-[#f87171]/5"
              }`}
            >
              <td className="px-3 py-2 text-xs text-[#52525b]">
                {row.rowNumber}
              </td>
              <td className="px-3 py-2 text-xs text-[#a1a1aa] whitespace-nowrap">
                {row.date
                  ? new Date(row.date).toLocaleDateString("en-IN")
                  : "—"}
              </td>
              <td className="px-3 py-2 text-xs text-[#e4e4e7] max-w-[220px] truncate">
                {row.merchant || row.description || "—"}
              </td>
              <td
                className={`px-3 py-2 text-xs font-semibold tabular-nums ${
                  row.type === "income" ? "text-[#4ade80]" : "text-[#f87171]"
                }`}
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                {inrFmt(row.amount)}
              </td>
              <td className="px-3 py-2 text-xs capitalize text-[#a1a1aa]">
                {row.type || "—"}
              </td>
              <td className="px-3 py-2 text-xs">
                {row.valid ? (
                  <span className="text-[#4ade80]">✓ Valid</span>
                ) : (
                  <span className="text-[#f87171]">⚠ Error</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

export default ImportPreviewTable;
