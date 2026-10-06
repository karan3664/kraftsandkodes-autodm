import { getEnv } from "@/lib/env";
import { hostnameOf, isLocalHost } from "@/lib/hosts";

export const INSTAGRAM_OAUTH_STATE_COOKIE = "autodm_ig_oauth_state";
export const INSTAGRAM_OAUTH_NEXT_COOKIE = "autodm_ig_oauth_next";

const OAUTH_RETURN_PATHS = new Set(["/dashboard", "/dashboard/instagram"]);

export function parseOAuthReturnTo(raw: string | null | undefined) {
  return raw && OAUTH_RETURN_PATHS.has(raw) ? raw : "/dashboard/instagram";
}

export function oauthCallbackUrl(request: { nextUrl: URL; headers: Headers }) {
  const host = hostnameOf(request.headers.get("host"));
  if (isLocalHost(host)) {
    return `${request.nextUrl.origin}/api/instagram/callback`;
  }
  const env = getEnv();
  return (
    env.META_REDIRECT_URI ||
    `${env.APP_URL.replace(/\/$/, "")}/api/instagram/callback`
  );
}

export function oauthStateCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: getEnv().NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  };
}
