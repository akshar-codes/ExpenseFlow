export const BRAND = {
  bg: "#0a0a0c",
  card: "#18181b",
  border: "#27272a",
  text: "#e4e4e7",
  muted: "#a1a1aa",
  faint: "#71717a",
  accent: "#6366f1",
  green: "#4ade80",
  red: "#f87171",
  yellow: "#facc15",
};

const FRONTEND_URL = process.env.CLIENT_URL || "http://localhost:5173";

export const inr = (v) =>
  `₹${Number(v ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

export const renderEmailLayout = ({
  preheader = "",
  title,
  heading,
  bodyHtml,
  ctaLabel,
  ctaUrl,
  unsubscribeToken,
}) => {
  const cta =
    ctaLabel && ctaUrl
      ? `
    <tr>
      <td align="center" style="padding: 24px 32px 8px;">
        <a href="${ctaUrl}" target="_blank"
           style="display:inline-block;padding:12px 28px;border-radius:10px;
                  background:${BRAND.accent};color:#ffffff;font-weight:600;
                  font-size:14px;text-decoration:none;font-family:Arial,Helvetica,sans-serif;">
          ${ctaLabel}
        </a>
      </td>
    </tr>`
      : "";

  const unsubscribeUrl = unsubscribeToken
    ? `${FRONTEND_URL}/settings/notifications?unsubscribe=${unsubscribeToken}`
    : `${FRONTEND_URL}/settings/notifications`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${heading}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.bg};font-family:Arial,Helvetica,sans-serif;">
  <span style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.bg};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0"
               style="max-width:560px;width:100%;background:${BRAND.card};border:1px solid ${BRAND.border};border-radius:16px;overflow:hidden;">
          <tr>
            <td style="padding:28px 32px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-size:20px;">💸</td>
                  <td style="font-size:14px;font-weight:700;color:#ffffff;padding-left:8px;">
                    ExpenseTracker
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px 4px;">
              <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:0.1em;
                        text-transform:uppercase;color:${BRAND.accent};">
                ${title}
              </p>
              <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#ffffff;">
                ${heading}
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 8px;color:${BRAND.muted};font-size:14px;line-height:1.6;">
              ${bodyHtml}
            </td>
          </tr>
          ${cta}
          <tr>
            <td style="padding:28px 32px 28px;border-top:1px solid ${BRAND.border};margin-top:24px;">
              <p style="margin:20px 0 0;font-size:11px;color:${BRAND.faint};line-height:1.6;">
                You're receiving this because you have an ExpenseTracker account.
                <a href="${unsubscribeUrl}" style="color:${BRAND.faint};text-decoration:underline;">
                  Manage email preferences
                </a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

export const statRow = (label, value, color = BRAND.text) => `
  <tr>
    <td style="padding:6px 0;color:${BRAND.faint};font-size:13px;">${label}</td>
    <td align="right" style="padding:6px 0;color:${color};font-size:13px;font-weight:700;">${value}</td>
  </tr>`;

export { FRONTEND_URL };
