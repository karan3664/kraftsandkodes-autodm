import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@kdl/db";
import { encryptSecret, randomToken } from "@kdl/shared/crypto";
import { InstagramApiError } from "@kdl/instagram";
import { getEnv, isMockMode } from "@/lib/env";
import { getInstagramClient } from "@/lib/instagram";
import { jsonError } from "@/lib/http";
import { logger } from "@/lib/logger";
import {
  canConnectAnotherAccount,
  setSelectedInstagramCookie,
} from "@/lib/instagram-selection";
import { INSTAGRAM_ACCOUNT_LIMIT_MESSAGE } from "@/lib/plans";
import {
  INSTAGRAM_OAUTH_NEXT_COOKIE,
  INSTAGRAM_OAUTH_STATE_COOKIE,
  oauthStateCookieOptions,
  parseOAuthReturnTo,
} from "@/lib/instagram-oauth-url";

export {
  INSTAGRAM_OAUTH_STATE_COOKIE,
  oauthCallbackUrl,
} from "@/lib/instagram-oauth-url";

export function attachOAuthStateCookie(
  response: NextResponse,
  state: string,
  returnTo?: string,
) {
  const options = oauthStateCookieOptions();
  response.cookies.set(INSTAGRAM_OAUTH_STATE_COOKIE, state, options);
  response.cookies.set(
    INSTAGRAM_OAUTH_NEXT_COOKIE,
    parseOAuthReturnTo(returnTo),
    options,
  );
  return response;
}

export async function createOAuthState() {
  const state = randomToken(16);
  const jar = await cookies();
  jar.set(INSTAGRAM_OAUTH_STATE_COOKIE, state, oauthStateCookieOptions());
  return state;
}

export async function completeOAuth(
  code: string,
  userId: string,
  redirectUri?: string,
) {
  const env = getEnv();
  const client = getInstagramClient(redirectUri);
  const tokens = await client.exchangeCode(code);
  const profile = await client.getProfile(tokens.accessToken);
  const subscription = await client.subscribeWebhooks({
    accessToken: tokens.accessToken,
    fields: ["comments", "messages"],
  });

  const existing = await prisma.instagramAccount.findUnique({
    where: { instagramUserId: profile.id },
  });
  if (existing && existing.userId !== userId) {
    throw new InstagramAccountTakenError();
  }
  if (!existing) {
    const allowed = await canConnectAnotherAccount(userId);
    if (!allowed.ok) {
      throw new InstagramAccountLimitError(allowed.limit);
    }
  }

  const saved = await prisma.instagramAccount.upsert({
    where: { instagramUserId: profile.id },
    update: {
      userId,
      username: profile.username,
      profilePictureUrl: profile.profilePictureUrl,
      accessTokenEncrypted: encryptSecret(
        tokens.accessToken,
        env.TOKEN_ENCRYPTION_KEY,
      ),
      tokenExpiresAt: tokens.expiresAt,
      disconnectedAt: null,
      connectedAt: new Date(),
      webhookStatus: subscription.success
        ? isMockMode()
          ? "mock"
          : "active"
        : "error",
      webhookError: subscription.success ? null : subscription.errorMessage,
    },
    create: {
      userId,
      instagramUserId: profile.id,
      username: profile.username,
      profilePictureUrl: profile.profilePictureUrl,
      accessTokenEncrypted: encryptSecret(
        tokens.accessToken,
        env.TOKEN_ENCRYPTION_KEY,
      ),
      tokenExpiresAt: tokens.expiresAt,
      webhookStatus: subscription.success
        ? isMockMode()
          ? "mock"
          : "active"
        : "error",
      webhookError: subscription.success ? null : subscription.errorMessage,
    },
  });
  await setSelectedInstagramCookie(saved.id);

  logger.info("instagram_connected", {
    instagramAccountId: saved.id,
  });
}

export class InstagramAccountLimitError extends Error {
  constructor(readonly limit: number) {
    super("INSTAGRAM_ACCOUNT_LIMIT");
    this.name = "InstagramAccountLimitError";
  }
}

export class InstagramAccountTakenError extends Error {
  constructor() {
    super("INSTAGRAM_ALREADY_LINKED");
    this.name = "InstagramAccountTakenError";
  }
}

export function mapConnectError(error: unknown) {
  if (error instanceof InstagramAccountLimitError) {
    return jsonError(
      "INSTAGRAM_ACCOUNT_LIMIT",
      INSTAGRAM_ACCOUNT_LIMIT_MESSAGE,
      403,
    );
  }
  if (error instanceof InstagramAccountTakenError) {
    return jsonError(
      "INSTAGRAM_ALREADY_LINKED",
      "That Instagram account is already connected to another user.",
      409,
    );
  }
  if (error instanceof InstagramApiError && error.status === 401) {
    return jsonError(
      "INSTAGRAM_TOKEN_EXPIRED",
      "Instagram connection expired. Please reconnect your account.",
      401,
    );
  }
  return jsonError(
    "INSTAGRAM_NOT_CONFIGURED",
    "Instagram connection failed. Check Meta app settings and try again.",
    400,
  );
}
