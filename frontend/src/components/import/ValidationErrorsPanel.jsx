import React, { useState } from "react";

const ValidationErrorsPanel = ({ errors }) => {
  const [expanded, setExpanded] = useState(false);
  if (!errors?.length) return null;

  const visible = expanded ? errors : errors.slice(0, 5);

  return (
    <div className="rounded-xl border border-[#f87171]/20 bg-[#f87171]/5 px-4 py-3">
      <p className="text-sm font-semibold text-[#f87171] mb-2">
        {errors.length} validation issue{errors.length !== 1 ? "s" : ""} found
      </p>
      <ul className="space-y-1">
        {visible.map((msg, idx) => (
          <li key={idx} className="text-xs text-[#f87171]/80">
            {msg}
          </li>
        ))}
      </ul>
      {errors.length > 5 && (
        <button
          onClick={() => setExpanded((p) => !p)}
          className="text-xs text-[#f87171] mt-2 hover:underline"
        >
          {expanded ? "Show less" : `Show ${errors.length - 5} more →`}
        </button>
      )}
    </div>
  );
};

export default ValidationErrorsPanel;
