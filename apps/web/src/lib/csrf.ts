import { getEnv } from "./env";
import { jsonError } from "./http";

export function isAllowedOrigin(
  origin: string,
  appUrl: string,
  nodeEnv: string,
): boolean {
  const incoming = origin.replace(/\/$/, "");
  const expected = appUrl.replace(/\/$/, "");
  if (incoming === expected) {
    return true;
  }
  if (nodeEnv === "production") {
    return false;
  }
  try {
    const host = new URL(incoming).hostname;
    return host === "localhost" || host === "127.0.0.1";
  } catch {
    return false;
  }
}

export function assertSameOrigin(request: Request): Response | null {
  if (
    request.method === "GET" ||
    request.method === "HEAD" ||
    request.method === "OPTIONS"
  ) {
    return null;
  }
  const env = getEnv();
  const origin = request.headers.get("origin");
  if (origin) {
    if (!isAllowedOrigin(origin, env.APP_URL, env.NODE_ENV)) {
      return jsonError("FORBIDDEN", "Request origin was rejected.", 403);
    }
    return null;
  }
  if (env.NODE_ENV !== "production") {
    return null;
  }
  const referer = request.headers.get("referer");
  if (!referer) {
    return jsonError("FORBIDDEN", "Request origin was rejected.", 403);
  }
  try {
    const refererOrigin = new URL(referer).origin;
    if (!isAllowedOrigin(refererOrigin, env.APP_URL, env.NODE_ENV)) {
      return jsonError("FORBIDDEN", "Request origin was rejected.", 403);
    }
  } catch {
    return jsonError("FORBIDDEN", "Request origin was rejected.", 403);
  }
  return null;
}
