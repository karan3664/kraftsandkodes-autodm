import { prisma } from "@kdl/db";
import { decryptSecret, encryptSecret } from "@kdl/shared/crypto";
import { requireUser } from "@/lib/auth/session";
import { getAccessibleInstagramAccount } from "@/lib/auth/ownership";
import { loadWorkspace } from "@/lib/team/workspace";
import { assertSameOrigin } from "@/lib/csrf";
import { getEnv } from "@/lib/env";
import { jsonError, jsonOk, readJson } from "@/lib/http";
import { getInstagramClient } from "@/lib/instagram";
import { logger } from "@/lib/logger";

export async function POST(request: Request) {
  const originError = assertSameOrigin(request);
  if (originError) {
    return originError;
  }
  const user = await requireUser();
  if (!user) {
    return jsonError("UNAUTHORIZED", "You need to sign in to continue.", 401);
  }

  const body = await readJson<{ accountId?: string }>(request).catch(
    () => ({}) as { accountId?: string },
  );
  if (!body.accountId) {
    return jsonError("VALIDATION_ERROR", "accountId is required.", 400);
  }
  const ws = await loadWorkspace(user);
  if (!ws.canManageIg) {
    return jsonError(
      "FORBIDDEN",
      "Only the owner or an admin can disconnect Instagram.",
      403,
    );
  }
  const account = await getAccessibleInstagramAccount(ws, body.accountId);
  if (!account) {
    return jsonError("FORBIDDEN", "That Instagram account is not yours.", 403);
  }

  const env = getEnv();
  const client = getInstagramClient();
  try {
    const accessToken = decryptSecret(
      account.accessTokenEncrypted,
      env.TOKEN_ENCRYPTION_KEY,
    );
    await client.revokeAccess(accessToken);
  } catch {
    logger.warn("instagram_revoke_failed", {
      instagramAccountId: account.id,
    });
  }

  // Soft-disconnect: keep the row so the plan slot stays bound to this IG id.
  await prisma.$transaction(async (tx) => {
    await tx.automation.deleteMany({
      where: { instagramAccountId: account.id },
    });
    await tx.teamMemberAccount.deleteMany({
      where: { instagramAccountId: account.id },
    });
    await tx.instagramAccount.update({
      where: { id: account.id },
      data: {
        disconnectedAt: new Date(),
        accessTokenEncrypted: encryptSecret(
          "revoked",
          env.TOKEN_ENCRYPTION_KEY,
        ),
        tokenExpiresAt: null,
        webhookStatus: "disconnected",
        webhookError: null,
      },
    });
  });

  logger.info("instagram_disconnected", {
    instagramAccountId: account.id,
  });
  return jsonOk({ disconnected: true });
}
