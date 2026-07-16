export const REPORT_TYPES = Object.freeze({
  MONTHLY: "monthly",
  CUSTOM: "custom",
});

export const REPORT_STATUS = Object.freeze({
  GENERATING: "generating",
  COMPLETED: "completed",
  FAILED: "failed",
});

// Keep in sync with backend/src/models/Report.js (REPORT_SECTION_KEYS).
export const REPORT_SECTIONS = [
  { value: "cover", label: "Cover Page", locked: true },
  { value: "income", label: "Income", locked: false },
  { value: "expense", label: "Expense", locked: false },
  { value: "charts", label: "Charts", locked: false },
  { value: "budget", label: "Budget Analysis", locked: false },
  { value: "goals", label: "Goal Progress", locked: false },
  { value: "health", label: "Financial Health", locked: false },
  { value: "aiSummary", label: "AI Summary", locked: false },
];

export const DEFAULT_SECTIONS = REPORT_SECTIONS.map((s) => s.value);
