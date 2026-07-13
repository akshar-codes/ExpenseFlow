import { renderEmailLayout, statRow, inr, FRONTEND_URL, BRAND } from "./layout.js";

export const buildRecurringReminderEmail = (
  payload = {},
  { unsubscribeToken } = {},
) => {
  const { title, type, amount = 0, frequency, nextDate } = payload;
  const isIncome = type === "income";

  const bodyHtml = `
    <p style="margin:0 0 16px;">
      Your ${frequency} ${isIncome ? "income" : "expense"}
      <strong style="color:${BRAND.text};">${title}</strong> is scheduled to post soon.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
           style="border:1px solid ${BRAND.border};border-radius:10px;padding:14px 16px;">
      ${statRow("Amount", inr(amount), isIncome ? BRAND.green : BRAND.red)}
      ${statRow("Next date", nextDate)}
    </table>`;

  const html = renderEmailLayout({
    preheader: `${title} posts on ${nextDate}`,
    title: "Upcoming recurring transaction",
    heading: `${title} is coming up`,
    bodyHtml,
    ctaLabel: "Review recurring transactions",
    ctaUrl: `${FRONTEND_URL}/recurring`,
    unsubscribeToken,
  });

  const text = `${title} (${frequency}) — ${inr(amount)} — scheduled for ${nextDate}.`;

  return { subject: `Reminder: ${title} posts soon`, html, text };
};

export default buildRecurringReminderEmail;
