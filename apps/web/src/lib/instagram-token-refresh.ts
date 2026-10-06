import { prisma } from "@kdl/db";
import { encryptSecret, decryptSecret } from "@kdl/shared/crypto";
import { getEnv } from "./env";
import { getInstagramClient } from "./instagram";
import { logger } from "./logger";
import { getRedis } from "./redis";

/** Refresh when fewer than this many ms remain (7 days). */
export const TOKEN_REFRESH_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000;

const localLocks = new Set<string>();

export function needsTokenRefresh(
  tokenExpiresAt: Date | null | undefined,
  now = new Date(),
  thresholdMs = TOKEN_REFRESH_THRESHOLD_MS,
): boolean {
  if (!tokenExpiresAt) {
    return false;
  }
  const msLeft = tokenExpiresAt.getTime() - now.getTime();
  return msLeft > 0 && msLeft <= thresholdMs;
}

async function acquireLock(accountId: string): Promise<boolean> {
  const redis = getRedis();
  const key = `ig_token_refresh:${accountId}`;
  if (redis) {
    try {
      if (redis.status === "wait") {
        await redis.connect();
      }
      const ok = await redis.set(key, "1", "EX", 300, "NX");
      return ok === "OK";
    } catch {
      // fall through to process-local lock
    }
  }
  if (localLocks.has(accountId)) {
    return false;
  }
  localLocks.add(accountId);
  return true;
}

async function releaseLock(accountId: string): Promise<void> {
  localLocks.delete(accountId);
  const redis = getRedis();
  if (!redis) return;
  try {
    if (redis.status === "wait") {
      await redis.connect();
    }
    await redis.del(`ig_token_refresh:${accountId}`);
  } catch {
    // ignore
  }
}

export type RefreshAccountResult =
  | { accountId: string; status: "skipped" }
  | { accountId: string; status: "refreshed"; expiresAt: Date | null }
  | { accountId: string; status: "failed"; reason: string }
  | { accountId: string; status: "locked" };

export async function refreshInstagramAccountToken(
  account: {
    id: string;
    accessTokenEncrypted: string;
    tokenExpiresAt: Date | null;
  },
  now = new Date(),
  deps?: {
    refreshToken?: (token: string) => Promise<{
      accessToken: string;
      expiresAt?: Date;
    }>;
    encrypt?: (plain: string, key: string) => string;
    decrypt?: (cipher: string, key: string) => string;
  },
): Promise<RefreshAccountResult> {
  if (!needsTokenRefresh(account.tokenExpiresAt, now)) {
    return { accountId: account.id, status: "skipped" };
  }

  const locked = await acquireLock(account.id);
  if (!locked) {
    return { accountId: account.id, status: "locked" };
  }

  try {
    const key = getEnv().TOKEN_ENCRYPTION_KEY;
    const decrypt = deps?.decrypt ?? decryptSecret;
    const encrypt = deps?.encrypt ?? encryptSecret;
    const accessToken = decrypt(account.accessTokenEncrypted, key);
    const refresh =
      deps?.refreshToken ??
      ((token: string) => getInstagramClient().refreshToken(token));
    const next = await refresh(accessToken);
    const encrypted = encrypt(next.accessToken, key);
    const expiresAt = next.expiresAt ?? null;
    await prisma.instagramAccount.update({
      where: { id: account.id },
      data: {
        accessTokenEncrypted: encrypted,
        tokenExpiresAt: expiresAt,
        webhookError: null,
      },
    });
    logger.info("instagram_token_refreshed", {
      accountId: account.id,
      expiresAt: expiresAt?.toISOString() ?? null,
    });
    return { accountId: account.id, status: "refreshed", expiresAt };
  } catch (error) {
    const reason =
      error instanceof Error ? error.message.slice(0, 180) : "refresh_failed";
    logger.warn("instagram_token_refresh_failed", {
      accountId: account.id,
      reason,
    });
    await prisma.instagramAccount.update({
      where: { id: account.id },
      data: {
        webhookError: "Token refresh failed. Reconnect Instagram if DMs stop.",
      },
    });
    return { accountId: account.id, status: "failed", reason };
  } finally {
    await releaseLock(account.id);
  }
}

export async function refreshDueInstagramTokens(now = new Date()) {
  const threshold = new Date(now.getTime() + TOKEN_REFRESH_THRESHOLD_MS);
  const accounts = await prisma.instagramAccount.findMany({
    where: {
      disconnectedAt: null,
      tokenExpiresAt: {
        gt: now,
        lte: threshold,
      },
    },
    select: {
      id: true,
      accessTokenEncrypted: true,
      tokenExpiresAt: true,
    },
    take: 100,
  });

  const results: RefreshAccountResult[] = [];
  for (const account of accounts) {
    results.push(await refreshInstagramAccountToken(account, now));
  }
  return {
    considered: accounts.length,
    results,
  };
}
