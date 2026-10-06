import { prisma } from "@kdl/db";
import { decryptSecret } from "@kdl/shared/crypto";
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

  const client = getInstagramClient();
  try {
    const accessToken = decryptSecret(
      account.accessTokenEncrypted,
      getEnv().TOKEN_ENCRYPTION_KEY,
    );
    await client.revokeAccess(accessToken);
  } catch {
    logger.warn("instagram_revoke_failed", {
      instagramAccountId: account.id,
    });
  }

  await prisma.instagramAccount.delete({ where: { id: account.id } });
  return jsonOk({ disconnected: true });
}
