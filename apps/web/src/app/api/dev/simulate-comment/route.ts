import { prisma } from "@kdl/db";
import { simulateCommentSchema } from "@kdl/shared";
import { requireUser } from "@/lib/auth/session";
import { assertSameOrigin } from "@/lib/csrf";
import { jsonError, jsonOk, readJson } from "@/lib/http";
import { isMockMode } from "@/lib/env";
import { processIncomingComment } from "@/lib/automation/engine";

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production" || !isMockMode()) {
    return jsonError(
      "FORBIDDEN",
      "Comment simulation is only available in local mock mode.",
      403,
    );
  }

  const originError = assertSameOrigin(request);
  if (originError) {
    return originError;
  }

  const user = await requireUser();
  if (!user) {
    return jsonError("UNAUTHORIZED", "You need to sign in to continue.", 401);
  }

  const parsed = simulateCommentSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return jsonError("VALIDATION_ERROR", "Invalid simulation payload.", 400);
  }

  const account = await prisma.instagramAccount.findFirst({
    where: { id: parsed.data.instagramAccountId, userId: user.id },
  });
  if (!account) {
    return jsonError(
      "FORBIDDEN",
      "That Instagram account does not belong to you.",
      403,
    );
  }

  const result = await processIncomingComment({
    eventId: `sim:${parsed.data.commentId}`,
    instagramUserId: account.instagramUserId,
    instagramMediaId: parsed.data.instagramMediaId,
    commentId: parsed.data.commentId,
    commentText: parsed.data.text,
    commenterUsername: parsed.data.username,
  });

  return jsonOk(result);
}
