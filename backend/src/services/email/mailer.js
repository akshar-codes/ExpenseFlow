import nodemailer from "nodemailer";
import logger from "../../config/logger.js";

let _transporter = null;

const buildTransporter = () => {
  const { SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS } =
    process.env;

  if (!SMTP_HOST) {
    throw new Error(
      "mailer: SMTP_HOST is not set. Configure SMTP_HOST, SMTP_PORT, " +
        "SMTP_USER, SMTP_PASS (and optionally SMTP_SECURE) in your .env.",
    );
  }

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: SMTP_SECURE === "true",
    auth:
      SMTP_USER && SMTP_PASS ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
  });
};

const getTransporter = () => {
  if (!_transporter) {
    _transporter = buildTransporter();
  }
  return _transporter;
};

/**
 * Send a single email. Throws on failure so callers (the queue worker) can
 * record the error and schedule a retry.
 */
export const sendMail = async ({ to, subject, html, text }) => {
  const transporter = getTransporter();
  const from =
    process.env.EMAIL_FROM || "ExpenseTracker <no-reply@expensetracker.app>";

  const info = await transporter.sendMail({ from, to, subject, html, text });

  logger.info({ to, subject, messageId: info.messageId }, "mailer: email sent");

  return info;
};

/**
 * Verify SMTP connectivity without sending an email. Useful for health
 * checks or an ops endpoint.
 */
export const verifyMailerConnection = async () => {
  try {
    await getTransporter().verify();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
};

// Exposed for tests: allows resetting the singleton transporter.
export const resetTransporter = () => {
  _transporter = null;
};
