import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { loginWithGoogle } from "@/lib/auth/service";
import { prismaAuthStore } from "@/lib/auth/store";
import { setSessionCookie } from "@/lib/auth/session";
import { googleProfileFromCode } from "@/lib/auth/google";
import { getEnv } from "@/lib/env";
import { logger } from "@/lib/logger";
import { safeEqual } from "@kdl/shared/crypto";
import { safeAppPath } from "@/lib/auth/next-path";

const COOKIE = "autodm_google_oauth_state";
const NEXT_COOKIE = "autodm_google_oauth_next";

export async function GET(request: NextRequest) {
  const env = getEnv();
  const login = new URL("/auth/login", env.APP_URL);
  const fail = () => {
    login.searchParams.set("error", "google");
    return NextResponse.redirect(login);
  };

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const jar = await cookies();
  const expected = jar.get(COOKIE)?.value;
  const next = safeAppPath(jar.get(NEXT_COOKIE)?.value);
  jar.delete(COOKIE);
  jar.delete(NEXT_COOKIE);

  if (
    request.nextUrl.searchParams.get("error") ||
    !code ||
    !state ||
    !expected ||
    !safeEqual(state, expected)
  ) {
    return fail();
  }

  try {
    const profile = await googleProfileFromCode(code);
    const result = await loginWithGoogle(prismaAuthStore, profile);
    await setSessionCookie(result.token, result.expiresAt);
    return NextResponse.redirect(new URL(next, env.APP_URL));
  } catch (error) {
    logger.error("google_oauth_failed", {
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return fail();
  }
}
