import {
  COMPANY_NAME,
  COMPANY_URL,
  MARKETING_ORIGIN,
  PRODUCT_NAME,
  SUPPORT_EMAIL,
} from "../hosts";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function buildTeamInviteEmail(input: {
  inviteeEmail: string;
  ownerName: string;
  role: string;
  inviteUrl: string;
  expiresAt: Date;
}): { subject: string; text: string; html: string } {
  const subject = "You've been invited to join KRAFTSANDKODES";
  const when = input.expiresAt.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
  });
  const role = input.role === "admin" ? "Admin" : "Member";
  const text = [
    `Hi,`,
    "",
    `${input.ownerName} invited you to join a KRAFTSANDKODES workspace as ${role}.`,
    `This invitation expires on ${when} (IST).`,
    "",
    `Accept: ${input.inviteUrl}`,
    "",
    `${PRODUCT_NAME} · ${SUPPORT_EMAIL}`,
  ].join("\n");
  const logo = `${MARKETING_ORIGIN}/brand/logo.jpg`;
  const html = `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#ede8dc;margin:0;padding:0;font-family:Georgia,'Times New Roman',serif;">
  <tr><td align="center" style="padding:36px 16px;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="560" style="max-width:560px;background:#ffffff;border-radius:8px;">
      <tr>
        <td align="center" style="padding:36px 36px 12px;">
          <img src="${logo}" alt="${escapeHtml(PRODUCT_NAME)}" width="160" style="display:block;width:160px;height:auto;border:0;"/>
        </td>
      </tr>
      <tr>
        <td style="padding:8px 40px 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.14em;color:#7c3aed;font-weight:700;">TEAM</td>
      </tr>
      <tr>
        <td style="padding:6px 40px 0;font-family:Arial,Helvetica,sans-serif;font-size:26px;line-height:1.25;color:#1c1917;font-weight:700;">You've been invited</td>
      </tr>
      <tr>
        <td style="padding:12px 40px 20px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#57534e;">${escapeHtml(input.ownerName)} invited you to join a ${escapeHtml(PRODUCT_NAME)} workspace as ${escapeHtml(role)}.</td>
      </tr>
      <tr>
        <td align="center" style="padding:0 40px 24px;">
          <a href="${escapeHtml(input.inviteUrl)}" style="display:inline-block;background:#7c3aed;color:#ffffff;text-decoration:none;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:700;padding:12px 24px;border-radius:999px;">Accept invitation</a>
        </td>
      </tr>
      <tr>
        <td style="padding:0 40px 24px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#78716c;">This link expires on ${escapeHtml(when)} (IST). If you were not expecting this, ignore the email.</td>
      </tr>
      <tr>
        <td align="center" style="padding:8px 40px 12px;border-top:1px solid #efeae0;font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:0.12em;color:#6b2d2d;font-weight:700;">${escapeHtml(PRODUCT_NAME)}</td>
      </tr>
      <tr>
        <td align="center" style="padding:0 40px 8px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#57534e;">${escapeHtml(SUPPORT_EMAIL)}</td>
      </tr>
      <tr>
        <td align="center" style="padding:0 40px 32px;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#a8a29e;">${escapeHtml(MARKETING_ORIGIN)} · ${escapeHtml(COMPANY_NAME)} · ${escapeHtml(COMPANY_URL.replace(/\/$/, ""))}</td>
      </tr>
    </table>
  </td></tr>
</table>`;
  return { subject, text, html };
}
