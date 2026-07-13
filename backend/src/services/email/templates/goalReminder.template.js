import { renderEmailLayout, statRow, inr, FRONTEND_URL, BRAND } from "./layout.js";

export const buildGoalReminderEmail = (
  payload = {},
  { unsubscribeToken } = {},
) => {
  const {
    goalTitle,
    targetAmount = 0,
    currentAmount = 0,
    progressPercentage = 0,
    daysRemaining = 0,
  } = payload;

  const remaining = Math.max(0, targetAmount - currentAmount);
  const progressLabel =
    typeof progressPercentage === "number"
      ? progressPercentage.toFixed(1)
      : progressPercentage;

  const bodyHtml = `
    <p style="margin:0 0 16px;">
      Your goal <strong style="color:${BRAND.text};">${goalTitle}</strong> is due in
      <strong style="color:${BRAND.yellow};">${daysRemaining} day${daysRemaining === 1 ? "" : "s"}</strong>.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
           style="border:1px solid ${BRAND.border};border-radius:10px;padding:14px 16px;">
      ${statRow("Progress", `${progressLabel}%`)}
      ${statRow("Saved so far", inr(currentAmount), BRAND.green)}
      ${statRow("Remaining", inr(remaining), BRAND.yellow)}
    </table>`;

  const html = renderEmailLayout({
    preheader: `${goalTitle} is due in ${daysRemaining} days`,
    title: "Goal reminder",
    heading: `${goalTitle}: ${daysRemaining} day${daysRemaining === 1 ? "" : "s"} left`,
    bodyHtml,
    ctaLabel: "Add a contribution",
    ctaUrl: `${FRONTEND_URL}/goals`,
    unsubscribeToken,
  });

  const text = `${goalTitle} is due in ${daysRemaining} days. Saved ${inr(currentAmount)} of ${inr(targetAmount)}.`;

  return { subject: `⏰ ${goalTitle} — ${daysRemaining}d left`, html, text };
};

export default buildGoalReminderEmail;
