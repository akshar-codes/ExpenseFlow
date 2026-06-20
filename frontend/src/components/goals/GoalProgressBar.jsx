import React from "react";

/**
 * Accessible progress bar for goal completion percentage.
 * Styled to match the app's dark theme.
 */
export function GoalProgressBar({
  percentage = 0,
  color = "#6366f1",
  showLabel = true,
  size = "md",
}) {
  const clamped = Math.min(Math.max(percentage, 0), 100);

  const heights = { sm: "h-1", md: "h-1.5", lg: "h-2.5" };
  const heightClass = heights[size] ?? heights.md;

  const barColor =
    clamped >= 100
      ? "#4ade80"
      : color && color !== "#6366f1"
        ? color
        : "#6366f1";

  return (
    <div className="w-full">
      <div
        className={`w-full rounded-full ${heightClass} overflow-hidden`}
        style={{ background: "rgba(255,255,255,0.06)" }}
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Goal progress: ${clamped}%`}
      >
        <div
          className={`${heightClass} rounded-full transition-all duration-500 ease-out`}
          style={{ width: `${clamped}%`, backgroundColor: barColor }}
        />
      </div>
      {showLabel && (
        <div className="flex justify-between mt-1">
          <span
            className="text-[11px] text-[#52525b] tabular-nums"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            {clamped.toFixed(1)}%
          </span>
          {clamped >= 100 && (
            <span className="text-[11px] font-semibold text-[#4ade80]">
              Completed ✓
            </span>
          )}
        </div>
      )}
    </div>
  );
}
