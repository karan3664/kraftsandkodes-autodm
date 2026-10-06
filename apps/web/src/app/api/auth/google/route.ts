import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { randomToken } from "@kdl/shared/crypto";
import { getEnv } from "@/lib/env";
import { googleAuthorizeUrl, googleConfigured } from "@/lib/auth/google";
import { DASHBOARD_PATH, safeAppPath } from "@/lib/auth/next-path";
import { rateLimit } from "@/lib/rate-limit";

const COOKIE = "autodm_google_oauth_state";
const NEXT_COOKIE = "autodm_google_oauth_next";

export async function GET(request: NextRequest) {
  const env = getEnv();
  const login = new URL("/auth/login", env.APP_URL);
  if (!googleConfigured()) {
    login.searchParams.set("error", "google");
    return NextResponse.redirect(login);
  }

  const limited = await rateLimit("auth:google", 20, 60_000);
  if (!limited.ok) {
    login.searchParams.set("error", "google");
    return NextResponse.redirect(login);
  }

  const state = randomToken(16);
  const next = safeAppPath(request.nextUrl.searchParams.get("next"));
  const jar = await cookies();
  jar.set(COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });
  if (next !== DASHBOARD_PATH) {
    jar.set(NEXT_COOKIE, next, {
      httpOnly: true,
      sameSite: "lax",
      secure: env.NODE_ENV === "production",
      path: "/",
      maxAge: 600,
    });
  } else {
    jar.delete(NEXT_COOKIE);
  }
  return NextResponse.redirect(googleAuthorizeUrl(state));
}
