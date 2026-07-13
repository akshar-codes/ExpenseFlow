import { renderEmailLayout, statRow, inr, FRONTEND_URL, BRAND } from "./layout.js";

export const buildMonthlySummaryEmail = (
  payload = {},
  { unsubscribeToken } = {},
) => {
  const {
    monthLabel,
    income = 0,
    expense = 0,
    balance = 0,
    savingsRate = 0,
    topCategories = [],
  } = payload;

  const balanceColor = balance >= 0 ? BRAND.green : BRAND.red;

  const categoryRows = topCategories
    .slice(0, 5)
    .map((c) => statRow(c.name, inr(c.total)))
    .join("");

  const bodyHtml = `
    <p style="margin:0 0 16px;">Your financial summary for ${monthLabel}.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
           style="border:1px solid ${BRAND.border};border-radius:10px;padding:14px 16px;margin-bottom:16px;">
      ${statRow("Income", inr(income), BRAND.green)}
      ${statRow("Expenses", inr(expense), BRAND.red)}
      ${statRow("Net balance", inr(balance), balanceColor)}
      ${statRow("Savings rate", `${savingsRate}%`, BRAND.yellow)}
    </table>
    ${
      categoryRows
        ? `<p style="margin:0 0 8px;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;color:${BRAND.faint};">Top categories</p>
           <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">${categoryRows}</table>`
        : ""
    }`;

  const html = renderEmailLayout({
    preheader: `Monthly summary: ${inr(balance)} net for ${monthLabel}`,
    title: "Monthly summary",
    heading: `Your ${monthLabel} report is ready`,
    bodyHtml,
    ctaLabel: "View full report",
    ctaUrl: `${FRONTEND_URL}/reports`,
    unsubscribeToken,
  });

  const text = `Monthly summary (${monthLabel})\nIncome: ${inr(income)}\nExpenses: ${inr(expense)}\nNet balance: ${inr(balance)}\nSavings rate: ${savingsRate}%`;

  return { subject: `Monthly summary — ${monthLabel}`, html, text };
};

export default buildMonthlySummaryEmail;
