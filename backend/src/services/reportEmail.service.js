import nodemailer from "nodemailer";
import logger from "../config/logger.js";

/**
 * CAVEAT — read before deploying alongside the existing notification module:
 */

let _transporter = null;

const getTransporter = () => {
  if (_transporter) return _transporter;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE } =
    process.env;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    throw new Error(
      "Email is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS in your .env file.",
    );
  }

  _transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: SMTP_SECURE === "true",
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  return _transporter;
};

export const sendReportEmail = async ({
  to,
  reportType,
  periodLabel,
  filePath,
  fileName,
}) => {
  const transporter = getTransporter();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;

  const subject = `Your ${reportType === "monthly" ? "Monthly" : "Custom"} Financial Report — ${periodLabel}`;

  const html = `
    <div style="font-family: Arial, Helvetica, sans-serif; color: #18181b;">
      <h2 style="color: #4f46e5; margin: 0 0 12px;">Your ExpenseTracker Report is Ready</h2>
      <p style="margin: 0 0 8px;">
        Attached is your ${reportType === "monthly" ? "monthly" : "custom date range"} financial report
        for <strong>${periodLabel}</strong>.
      </p>
      <p style="color: #71717a; font-size: 13px; margin-top: 24px;">
        This is an automated message from ExpenseTracker.
      </p>
    </div>
  `;

  const info = await transporter.sendMail({
    from,
    to,
    subject,
    html,
    attachments: [
      { filename: fileName, path: filePath, contentType: "application/pdf" },
    ],
  });

  logger.info(
    { to, messageId: info.messageId },
    "reportEmail: report email sent",
  );
  return info;
};

// Exposed for tests: allows resetting the singleton transporter.
export const resetReportEmailTransporter = () => {
  _transporter = null;
};
