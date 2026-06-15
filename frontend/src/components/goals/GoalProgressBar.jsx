import React from "react";

/**
 * Accessible progress bar for goal completion percentage.
 */
export function GoalProgressBar({
  percentage = 0,
  color = "#6366f1",
  showLabel = true,
  size = "md",
}) {
  const clamped = Math.min(Math.max(percentage, 0), 100);

  const heights = { sm: "h-1.5", md: "h-2.5", lg: "h-4" };
  const heightClass = heights[size] ?? heights.md;

  const getColorClass = () => {
    if (clamped >= 100) return "bg-green-500";
    if (clamped >= 75) return "bg-blue-500";
    if (clamped >= 50) return "bg-indigo-500";
    if (clamped >= 25) return "bg-yellow-500";
    return "bg-red-400";
  };

  // Allow explicit color override (hex) via inline style
  const useInlineColor = color && color !== "#6366f1" && clamped < 100;

  return (
    <div className="w-full">
      <div
        className={`w-full bg-gray-200 dark:bg-gray-700 rounded-full ${heightClass} overflow-hidden`}
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Goal progress: ${clamped}%`}
      >
        <div
          className={`${heightClass} rounded-full transition-all duration-500 ease-out ${useInlineColor ? "" : getColorClass()}`}
          style={{
            width: `${clamped}%`,
            ...(useInlineColor ? { backgroundColor: color } : {}),
          }}
        />
      </div>
      {showLabel && (
        <div className="flex justify-between mt-1">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {clamped.toFixed(1)}%
          </span>
          {clamped >= 100 && (
            <span className="text-xs font-medium text-green-600 dark:text-green-400">
              Completed ✓
            </span>
          )}
        </div>
      )}
    </div>
  );
}
