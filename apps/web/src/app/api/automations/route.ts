import { prisma } from "@kdl/db";
import { automationInputSchema } from "@kdl/shared";
import { requireUser } from "@/lib/auth/session";
import { getAccessibleMedia } from "@/lib/auth/ownership";
import {
  ActiveAutomationLimitError,
  createAutomation,
} from "@/lib/automation/persist";
import { assertSameOrigin } from "@/lib/csrf";
import { jsonError, jsonOk } from "@/lib/http";
import { logger } from "@/lib/logger";
import { automationWhere, loadWorkspace } from "@/lib/team/workspace";

export async function GET() {
  const user = await requireUser();
  if (!user) {
    return jsonError("UNAUTHORIZED", "You need to sign in to continue.", 401);
  }
  const ws = await loadWorkspace(user);
  const automations = await prisma.automation.findMany({
    where: automationWhere(ws),
    include: { keywords: true, media: true },
    orderBy: { createdAt: "desc" },
  });
  return jsonOk({ automations });
}

export async function POST(request: Request) {
  const originError = assertSameOrigin(request);
  if (originError) {
    return originError;
  }
  const user = await requireUser();
  if (!user) {
    return jsonError("UNAUTHORIZED", "You need to sign in to continue.", 401);
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return jsonError(
      "VALIDATION_ERROR",
      "Check automation fields and try again.",
      400,
    );
  }
  const parsed = automationInputSchema.safeParse(raw);
  if (!parsed.success) {
    return jsonError(
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message ??
        "Check automation fields and try again.",
      400,
    );
  }

  const ws = await loadWorkspace(user);
  const media = await getAccessibleMedia(
    ws,
    parsed.data.mediaId,
    parsed.data.instagramAccountId,
  );
  if (!media) {
    return jsonError(
      "FORBIDDEN",
      "Choose a post or reel from your connected account.",
      403,
    );
  }

  try {
    const automation = await createAutomation(ws.ownerUserId, parsed.data);
    return jsonOk({ automation }, 201);
  } catch (error) {
    if (error instanceof ActiveAutomationLimitError) {
      return jsonError("PLAN_AUTOMATION_LIMIT", error.message, 403);
    }
    logger.error("automation_create_failed", {
      message: error instanceof Error ? error.message.slice(0, 180) : "unknown",
    });
    return jsonError(
      "INTERNAL_ERROR",
      "Could not create the automation. Try again.",
      500,
    );
  }
}
