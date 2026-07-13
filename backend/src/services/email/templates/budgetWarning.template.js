import { renderEmailLayout, statRow, inr, FRONTEND_URL, BRAND } from "./layout.js";

export const buildBudgetWarningEmail = (
  payload = {},
  { unsubscribeToken } = {},
) => {
  const {
    categoryName,
    limit = 0,
    spent = 0,
    percentage = 0,
    exceeded = false,
    monthLabel,
  } = payload;

  const statusColor = exceeded ? BRAND.red : BRAND.yellow;
  const statusText = exceeded ? "exceeded" : "close to its limit";

  const bodyHtml = `
    <p style="margin:0 0 16px;">
      Your <strong style="color:${BRAND.text};">${categoryName}</strong> budget for
      ${monthLabel} is ${statusText}.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
           style="border:1px solid ${BRAND.border};border-radius:10px;padding:14px 16px;">
      ${statRow("Budget limit", inr(limit))}
      ${statRow("Spent so far", inr(spent), statusColor)}
      ${statRow("Utilization", `${percentage}%`, statusColor)}
    </table>`;

  const html = renderEmailLayout({
    preheader: `${categoryName} budget is ${statusText} (${percentage}%)`,
    title: exceeded ? "Budget exceeded" : "Budget warning",
    heading: `${categoryName}: ${percentage}% of budget used`,
    bodyHtml,
    ctaLabel: "Review budget",
    ctaUrl: `${FRONTEND_URL}/categories`,
    unsubscribeToken,
  });

  const text = `${categoryName} budget ${statusText} for ${monthLabel}.\nLimit: ${inr(limit)}\nSpent: ${inr(spent)}\nUtilization: ${percentage}%`;

  return {
    subject: `⚠ Budget ${exceeded ? "exceeded" : "warning"}: ${categoryName}`,
    html,
    text,
  };
};

export default buildBudgetWarningEmail;
