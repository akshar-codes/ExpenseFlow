import { renderEmailLayout, statRow, inr, FRONTEND_URL, BRAND } from "./layout.js";

export const buildWeeklySummaryEmail = (
  payload = {},
  { unsubscribeToken } = {},
) => {
  const {
    weekLabel,
    income = 0,
    expense = 0,
    balance = 0,
    topCategory = null,
    transactionCount = 0,
  } = payload;

  const balanceColor = balance >= 0 ? BRAND.green : BRAND.red;

  const bodyHtml = `
    <p style="margin:0 0 16px;">Here's how your money moved during ${weekLabel}.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
           style="border:1px solid ${BRAND.border};border-radius:10px;padding:14px 16px;margin-bottom:14px;">
      ${statRow("Income", inr(income), BRAND.green)}
      ${statRow("Expenses", inr(expense), BRAND.red)}
      ${statRow("Net balance", inr(balance), balanceColor)}
      ${statRow("Transactions logged", transactionCount)}
    </table>
    ${
      topCategory
        ? `<p style="margin:0;">Biggest category this week: <strong style="color:${BRAND.text};">${topCategory.name}</strong> at ${inr(topCategory.total)}.</p>`
        : ""
    }`;

  const html = renderEmailLayout({
    preheader: `Weekly summary: ${inr(balance)} net for ${weekLabel}`,
    title: "Weekly summary",
    heading: `Your week in review — ${weekLabel}`,
    bodyHtml,
    ctaLabel: "View full report",
    ctaUrl: `${FRONTEND_URL}/reports`,
    unsubscribeToken,
  });

  const text = `Weekly summary (${weekLabel})\nIncome: ${inr(income)}\nExpenses: ${inr(expense)}\nNet balance: ${inr(balance)}\nTransactions: ${transactionCount}`;

  return { subject: `Weekly summary — ${weekLabel}`, html, text };
};

export default buildWeeklySummaryEmail;
