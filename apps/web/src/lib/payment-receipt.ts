import {
  COMPANY_NAME,
  COMPANY_URL,
  MARKETING_ORIGIN,
  PRODUCT_NAME,
  SUPPORT_EMAIL,
} from "./hosts";

import { paidCatalogRow } from "./plans";

export function planLabelFromAmount(amountPaise: number): string {
  return paidCatalogRow(amountPaise)?.label ?? "Custom";
}

export function formatInr(amountPaise: number): string {
  return `₹${(amountPaise / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function buildPaymentReceipt(input: {
  name: string;
  status: "paid" | "failed";
  amountPaise: number;
  currency: string;
  planLabel: string;
  orderId: string;
  paymentId?: string | null;
  receipt: string;
  reason?: string | null;
  at: Date;
}): { subject: string; text: string; html: string } {
  const amount = formatInr(input.amountPaise);
  const outcome = input.status === "paid" ? "Successful" : "Failed";
  const subject = `KRAFTSANDKODES payment receipt — ${outcome} ${amount}`;
  const when = input.at.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  const lines = [
    `Hi ${input.name},`,
    "",
    `Payment: ${outcome}`,
    `Plan: ${input.planLabel}`,
    `Amount: ${amount} ${input.currency}`,
    `Order ID: ${input.orderId}`,
    input.paymentId ? `Payment ID: ${input.paymentId}` : null,
    `Receipt: ${input.receipt}`,
    `Date: ${when}`,
    input.status === "failed" && input.reason
      ? `Reason: ${input.reason}`
      : null,
    "",
    "KRAFTSANDKODES",
  ].filter((line): line is string => line != null);

  const text = lines.join("\n");
  const intro =
    input.status === "paid"
      ? "Your payment was received. Plan access is now active."
      : "Your payment did not complete. No charge was applied to your plan.";
  const heading =
    input.status === "paid" ? "Payment successful" : "Payment failed";
  const logo = `${MARKETING_ORIGIN}/brand/logo.jpg`;
  const rows = [
    ["Plan", input.planLabel],
    ["Amount", `${amount} ${input.currency}`],
    ["Order ID", input.orderId],
    input.paymentId ? ["Payment ID", input.paymentId] : null,
    ["Receipt", input.receipt],
    ["Date", when],
    input.status === "failed" && input.reason ? ["Reason", input.reason] : null,
  ].filter((row): row is [string, string] => row != null);

  const html = `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#ede8dc;margin:0;padding:0;font-family:Georgia,'Times New Roman',serif;">
  <tr><td align="center" style="padding:36px 16px;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="560" style="max-width:560px;background:#ffffff;border-radius:8px;">
      <tr>
        <td align="center" style="padding:36px 36px 12px;">
          <img src="${logo}" alt="${escapeHtml(PRODUCT_NAME)}" width="160" style="display:block;width:160px;height:auto;border:0;"/>
        </td>
      </tr>
      <tr>
        <td style="padding:8px 40px 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.14em;color:#7c3aed;font-weight:700;">RECEIPT</td>
      </tr>
      <tr>
        <td style="padding:6px 40px 0;font-family:Arial,Helvetica,sans-serif;font-size:26px;line-height:1.25;color:#1c1917;font-weight:700;">${escapeHtml(heading)}</td>
      </tr>
      <tr>
        <td style="padding:12px 40px 20px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#57534e;">Hi ${escapeHtml(input.name)}, ${escapeHtml(intro)}</td>
      </tr>
      <tr>
        <td style="padding:0 40px 24px;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border:2px solid #c4a35a;border-radius:8px;">
            <tr>
              <td align="center" style="padding:18px 16px;font-family:Arial,Helvetica,sans-serif;font-size:28px;letter-spacing:0.08em;color:#6b2d2d;font-weight:700;">${escapeHtml(amount)}</td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding:0 40px 28px;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
            ${rows
              .map(
                ([label, value], index) => `<tr>
              <td style="padding:${index === 0 ? "0" : "10px"} 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#78716c;width:120px;vertical-align:top;">${escapeHtml(label)}</td>
              <td style="padding:${index === 0 ? "0" : "10px"} 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#1c1917;">${escapeHtml(value)}</td>
            </tr>`,
              )
              .join("")}
          </table>
        </td>
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

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
