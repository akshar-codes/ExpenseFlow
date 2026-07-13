// Keep this list in sync with backend/src/models/NotificationPreference.js
// (CONFIGURABLE_EMAIL_TYPES).
export const CONFIGURABLE_EMAIL_TYPE_META = [
  {
    type: "weeklySummary",
    label: "Weekly summary",
    description: "A recap of income, expenses, and net balance each week.",
  },
  {
    type: "monthlySummary",
    label: "Monthly summary",
    description: "A recap of income, expenses, and savings rate each month.",
  },
  {
    type: "budgetWarning",
    label: "Budget warnings",
    description: "Alerts when a category budget reaches 80% or is exceeded.",
  },
  {
    type: "goalCompleted",
    label: "Goal completed",
    description: "Celebrate when a savings goal is fully funded.",
  },
  {
    type: "goalReminder",
    label: "Goal reminders",
    description: "A nudge as a goal's target date approaches.",
  },
  {
    type: "recurringReminder",
    label: "Recurring reminders",
    description: "A heads-up before a recurring transaction posts.",
  },
];

export const SUMMARY_FREQUENCY_OPTIONS = [
  { value: "weekly", label: "Weekly only" },
  { value: "monthly", label: "Monthly only" },
  { value: "both", label: "Weekly and monthly" },
  { value: "none", label: "No summary emails" },
];
