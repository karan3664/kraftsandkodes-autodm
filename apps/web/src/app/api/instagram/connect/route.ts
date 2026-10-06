import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { getEnv } from "@/lib/env";
import { getInstagramClient, getInstagramStatus } from "@/lib/instagram";
import { jsonError } from "@/lib/http";
import {
  attachOAuthStateCookie,
  oauthCallbackUrl,
} from "@/lib/instagram-oauth";
import { randomToken } from "@kdl/shared/crypto";
import { canConnectAnotherAccount } from "@/lib/instagram-selection";
import { loadWorkspace } from "@/lib/team/workspace";

export async function GET(request: NextRequest) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.redirect(new URL("/auth/login", getEnv().APP_URL));
  }

  const status = getInstagramStatus();
  if (!status.configured && !status.mock) {
    return jsonError(
      "INSTAGRAM_NOT_CONFIGURED",
      "Instagram API is not configured.",
      400,
    );
  }

  const ws = await loadWorkspace(user);
  if (!ws.canManageIg) {
    return NextResponse.redirect(
      new URL("/dashboard/instagram?error=oauth_denied", getEnv().APP_URL),
    );
  }
  const allowed = await canConnectAnotherAccount(ws.ownerUserId);
  if (!allowed.ok) {
    return NextResponse.redirect(
      new URL("/dashboard/instagram?error=account_limit", getEnv().APP_URL),
    );
  }

  const redirectUri = oauthCallbackUrl(request);
  const state = randomToken(16);
  const client = getInstagramClient(redirectUri);
  const url = client.getAuthorizationUrl(state);
  const target = url.startsWith("http")
    ? url
    : new URL(url, request.nextUrl.origin).toString();
  const response = NextResponse.redirect(target);
  attachOAuthStateCookie(
    response,
    state,
    request.nextUrl.searchParams.get("next") ?? undefined,
  );
  return response;
}
