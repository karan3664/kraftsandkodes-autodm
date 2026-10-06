import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { getEnv } from "@/lib/env";
import { InstagramApiError, stripAuthorizationCode } from "@kdl/instagram";
import {
  completeOAuth,
  INSTAGRAM_OAUTH_STATE_COOKIE,
  InstagramAccountLimitError,
  InstagramAccountTakenError,
  oauthCallbackUrl,
} from "@/lib/instagram-oauth";
import {
  INSTAGRAM_OAUTH_NEXT_COOKIE,
  parseOAuthReturnTo,
} from "@/lib/instagram-oauth-url";
import { safeEqual } from "@kdl/shared/crypto";
import { logger } from "@/lib/logger";
import { loadWorkspace } from "@/lib/team/workspace";

export async function GET(request: NextRequest) {
  const user = await requireUser();
  const appUrl = getEnv().APP_URL;
  if (!user) {
    return NextResponse.redirect(new URL("/auth/login", appUrl));
  }

  if (request.nextUrl.searchParams.get("error")) {
    return redirectInstagram(request, appUrl, "oauth_denied");
  }

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const expected = request.cookies.get(INSTAGRAM_OAUTH_STATE_COOKIE)?.value;
  if (!code || !state || !expected || !safeEqual(state, expected)) {
    return redirectInstagram(request, appUrl, "oauth_state");
  }

  try {
    const ws = await loadWorkspace(user);
    if (!ws.canManageIg) {
      return redirectInstagram(request, appUrl, "oauth_denied");
    }
    await completeOAuth(
      stripAuthorizationCode(code),
      ws.ownerUserId,
      oauthCallbackUrl(request),
    );
    return redirectInstagram(request, appUrl, null);
  } catch (error) {
    if (error instanceof InstagramAccountTakenError) {
      return redirectInstagram(request, appUrl, "already_linked");
    }
    if (error instanceof InstagramAccountLimitError) {
      return redirectInstagram(request, appUrl, "account_limit");
    }
    const apiError = error instanceof InstagramApiError ? error : null;
    logger.error("instagram_oauth_callback_failed", {
      errorCode: apiError?.code ?? "UNKNOWN",
      httpStatus: apiError?.status ?? null,
      errorMessage: error instanceof Error ? error.message : String(error),
      graphCode: apiError?.graph?.code ?? null,
      graphSubcode: apiError?.graph?.subcode ?? null,
      graphType: apiError?.graph?.type ?? null,
      graphMessage: apiError?.graph?.message?.slice(0, 180) ?? null,
    });
    return redirectInstagram(request, appUrl, oauthFailParam(error));
  }
}

function oauthFailParam(error: unknown): string {
  if (!(error instanceof InstagramApiError)) return "oauth_failed";
  if (error.code === "OAUTH_REDIRECT_MISMATCH") return "oauth_redirect";
  if (error.code === "OAUTH_CODE_USED") return "oauth_code";
  if (error.code === "OAUTH_ACCOUNT_TYPE") return "oauth_account_type";
  if (error.code === "OAUTH_TESTER_REQUIRED") return "oauth_tester";
  if (error.code === "PERMISSION_DENIED") return "oauth_permission";
  const text = `${error.graph?.message ?? ""} ${error.message}`.toLowerCase();
  if (text.includes("redirect_uri") || text.includes("redirect uri")) {
    return "oauth_redirect";
  }
  if (
    text.includes("been used") ||
    text.includes("code has expired") ||
    text.includes("verification code")
  ) {
    return "oauth_code";
  }
  if (text.includes("unsupported request") && text.includes("method type")) {
    return "oauth_tester";
  }
  if (
    text.includes("permission") ||
    text.includes("scope") ||
    text.includes("not approved")
  ) {
    return "oauth_permission";
  }
  if (
    text.includes("professional") ||
    text.includes("business") ||
    text.includes("creator")
  ) {
    return "oauth_account_type";
  }
  return "oauth_failed";
}

function redirectInstagram(
  request: NextRequest,
  appUrl: string,
  error: string | null,
) {
  const returnTo = parseOAuthReturnTo(
    request.cookies.get(INSTAGRAM_OAUTH_NEXT_COOKIE)?.value,
  );
  const path = error ? `/dashboard/instagram?error=${error}` : returnTo;
  const response = NextResponse.redirect(new URL(path, appUrl));
  const clear = {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 0,
  };
  response.cookies.set(INSTAGRAM_OAUTH_STATE_COOKIE, "", clear);
  response.cookies.set(INSTAGRAM_OAUTH_NEXT_COOKIE, "", clear);
  return response;
}
