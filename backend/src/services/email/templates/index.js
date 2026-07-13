import { EMAIL_TYPES } from "../../../models/NotificationPreference.js";
import buildWelcomeEmail from "./welcome.template.js";
import buildWeeklySummaryEmail from "./weeklySummary.template.js";
import buildMonthlySummaryEmail from "./monthlySummary.template.js";
import buildBudgetWarningEmail from "./budgetWarning.template.js";
import buildGoalCompletedEmail from "./goalCompleted.template.js";
import buildGoalReminderEmail from "./goalReminder.template.js";
import buildRecurringReminderEmail from "./recurringReminder.template.js";

/**
 * Registry mapping an EMAIL_TYPES value to its template builder. Every
 */
export const TEMPLATE_REGISTRY = Object.freeze({
  [EMAIL_TYPES.WELCOME]: buildWelcomeEmail,
  [EMAIL_TYPES.WEEKLY_SUMMARY]: buildWeeklySummaryEmail,
  [EMAIL_TYPES.MONTHLY_SUMMARY]: buildMonthlySummaryEmail,
  [EMAIL_TYPES.BUDGET_WARNING]: buildBudgetWarningEmail,
  [EMAIL_TYPES.GOAL_COMPLETED]: buildGoalCompletedEmail,
  [EMAIL_TYPES.GOAL_REMINDER]: buildGoalReminderEmail,
  [EMAIL_TYPES.RECURRING_REMINDER]: buildRecurringReminderEmail,
});

export const renderTemplate = (type, payload, context) => {
  const builder = TEMPLATE_REGISTRY[type];
  if (!builder) {
    throw new Error(`No email template registered for type "${type}"`);
  }
  return builder(payload, context);
};
