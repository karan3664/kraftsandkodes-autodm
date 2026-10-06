export const MARKETING_HOST = "kraftsandkodes.com";
export const APP_HOST = "app.kraftsandkodes.com";
export const MARKETING_ORIGIN = `https://${MARKETING_HOST}`;
export const APP_ORIGIN = `https://${APP_HOST}`;
export const SUPPORT_EMAIL = "hello@karandigitallabs.com";
export const COMPANY_NAME = "Karan Digital Labs";
export const FOUNDER_NAME = "Karan Brahmaxatriya";
export const COMPANY_URL = "https://karandigitallabs.com/";
export const INSTAGRAM_HANDLE = "kraftsandkodes";
export const INSTAGRAM_URL = "https://www.instagram.com/kraftsandkodes/";
export const LINKEDIN_URL =
  "https://www.linkedin.com/in/karan-brahmaxatriya-526221401/";
export const PRODUCT_NAME = "KRAFTSANDKODES";
export const PRODUCT_TAGLINE = "Comment replies";

export const MARKETING_PATHS = new Set([
  "/",
  "/features",
  "/how-it-works",
  "/pricing",
  "/faq",
  "/contact",
  "/privacy",
  "/terms",
  "/refund",
  "/data-deletion",
]);

export function hostnameOf(hostHeader: string | null): string {
  return (hostHeader ?? "").split(":")[0]?.toLowerCase() ?? "";
}

export function isLocalHost(host: string): boolean {
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host.endsWith(".trycloudflare.com") ||
    host.endsWith(".local")
  );
}

export function isMarketingHost(host: string): boolean {
  return host === MARKETING_HOST || host === `www.${MARKETING_HOST}`;
}

export function isAppHost(host: string): boolean {
  return host === APP_HOST;
}

/** Cross-subdomain auth URLs. Relative /auth/* on kraftsandkodes.com client-navigates, RSC fetch fails, then a slow full reload. */
export function appHref(pathAndQuery: string, origin?: string): string {
  const path = pathAndQuery.startsWith("/") ? pathAndQuery : `/${pathAndQuery}`;
  const base =
    origin ?? (process.env.NODE_ENV === "production" ? APP_ORIGIN : "");
  return `${base}${path}`;
}
