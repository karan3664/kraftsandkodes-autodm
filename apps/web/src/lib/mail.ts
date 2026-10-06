import nodemailer from "nodemailer";
import { getEnv } from "./env";
import { logger } from "./logger";

export function mailConfigured(): boolean {
  return Boolean(getEnv().SMTP_HOST);
}

export async function sendMail(input: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<{ sent: boolean; error?: string }> {
  const env = getEnv();
  if (!env.SMTP_HOST) {
    // karan: no inbox without SMTP; upgrade path is a transactional provider (Resend).
    logger.warn("mail_skipped", { reason: "smtp_not_configured" });
    return { sent: false, error: "SMTP is not configured." };
  }

  try {
    const transport = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth:
        env.SMTP_USER && env.SMTP_PASS
          ? { user: env.SMTP_USER, pass: env.SMTP_PASS }
          : undefined,
    });
    await transport.sendMail({
      from: env.MAIL_FROM || `${env.APP_NAME} <noreply@karandigitallabs.com>`,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });
    return { sent: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Mail send failed.";
    logger.error("mail_send_failed", { message });
    return { sent: false, error: message };
  }
}
