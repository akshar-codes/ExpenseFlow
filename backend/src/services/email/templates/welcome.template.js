import { renderEmailLayout, FRONTEND_URL } from "./layout.js";

export const buildWelcomeEmail = (payload = {}, { unsubscribeToken } = {}) => {
  const { name } = payload;
  const heading = `Welcome to ExpenseTracker${name ? `, ${name.split(" ")[0]}` : ""}!`;

  const bodyHtml = `
    <p style="margin:0 0 14px;">
      Your account is ready. Start by logging your first transaction, setting
      up a budget, or creating a savings goal — your dashboard updates in
      real time as you go.
    </p>
    <p style="margin:0;">
      You can control which emails you receive at any time from your
      notification settings.
    </p>`;

  const html = renderEmailLayout({
    preheader: "Your ExpenseTracker account is ready.",
    title: "Getting started",
    heading,
    bodyHtml,
    ctaLabel: "Go to dashboard",
    ctaUrl: `${FRONTEND_URL}/dashboard`,
    unsubscribeToken,
  });

  const text = `Welcome to ExpenseTracker${name ? `, ${name}` : ""}!\n\nYour account is ready. Visit ${FRONTEND_URL}/dashboard to get started.`;

  return { subject: "Welcome to ExpenseTracker 🎉", html, text };
};

export default buildWelcomeEmail;
