import { getEnv } from "@/lib/env";

export const FOUNDER_ADMIN_EMAIL = "dev@karandigitallabs.com";

export function isAdminEmail(email: string, admins: string[]): boolean {
  return admins.includes(email.trim().toLowerCase());
}

export function withFounderAdmin(emails: string[]): string[] {
  const set = new Set(
    emails.map((item) => item.trim().toLowerCase()).filter(Boolean),
  );
  set.add(FOUNDER_ADMIN_EMAIL);
  return [...set];
}

export function isAdmin(user: { email: string }): boolean {
  return isAdminEmail(user.email, getEnv().ADMIN_EMAILS);
}
