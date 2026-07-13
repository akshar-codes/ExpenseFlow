import { renderEmailLayout, statRow, inr, FRONTEND_URL, BRAND } from "./layout.js";

export const buildGoalCompletedEmail = (
  payload = {},
  { unsubscribeToken } = {},
) => {
  const { goalTitle, targetAmount = 0, daysToComplete = null } = payload;

  const bodyHtml = `
    <p style="margin:0 0 16px;">
      🎉 You've fully funded <strong style="color:${BRAND.text};">${goalTitle}</strong>!
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
           style="border:1px solid ${BRAND.border};border-radius:10px;padding:14px 16px;">
      ${statRow("Goal amount", inr(targetAmount), BRAND.green)}
      ${daysToComplete != null ? statRow("Time to complete", `${daysToComplete} days`) : ""}
    </table>
    <p style="margin:16px 0 0;">
      Nice work staying consistent. Set your next goal to keep the momentum going.
    </p>`;

  const html = renderEmailLayout({
    preheader: `Goal completed: ${goalTitle}`,
    title: "Goal completed",
    heading: `You reached your goal: ${goalTitle}`,
    bodyHtml,
    ctaLabel: "View your goals",
    ctaUrl: `${FRONTEND_URL}/goals`,
    unsubscribeToken,
  });

  const text = `You reached your goal "${goalTitle}"! Target: ${inr(targetAmount)}.`;

  return { subject: `🎯 Goal completed: ${goalTitle}`, html, text };
};

export default buildGoalCompletedEmail;
