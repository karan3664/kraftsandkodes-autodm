import { prisma } from "@kdl/db";
import { automationPatchSchema } from "@kdl/shared";
import { requireUser } from "@/lib/auth/session";
import {
  getAccessibleAutomation,
  getAccessibleMedia,
} from "@/lib/auth/ownership";
import {
  updateAutomation,
  ActiveAutomationLimitError,
} from "@/lib/automation/persist";
import { assertSameOrigin } from "@/lib/csrf";
import { jsonError, jsonOk, readJson } from "@/lib/http";
import { loadWorkspace } from "@/lib/team/workspace";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const originError = assertSameOrigin(request);
  if (originError) {
    return originError;
  }
  const user = await requireUser();
  if (!user) {
    return jsonError("UNAUTHORIZED", "You need to sign in to continue.", 401);
  }

  const { id } = await context.params;
  const ws = await loadWorkspace(user);
  const existing = await getAccessibleAutomation(ws, id);
  if (!existing) {
    return jsonError("NOT_FOUND", "Automation not found.", 404);
  }

  const parsed = automationPatchSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return jsonError(
      "VALIDATION_ERROR",
      "Check automation fields and try again.",
      400,
    );
  }

  const accountId =
    parsed.data.instagramAccountId ?? existing.instagramAccountId;
  const mediaId = parsed.data.mediaId ?? existing.mediaId;
  if (parsed.data.mediaId || parsed.data.instagramAccountId) {
    const media = await getAccessibleMedia(ws, mediaId, accountId);
    if (!media) {
      return jsonError(
        "FORBIDDEN",
        "Choose a post or reel from your connected account.",
        403,
      );
    }
  }

  try {
    const automation = await updateAutomation(id, parsed.data);
    return jsonOk({ automation });
  } catch (error) {
    if (error instanceof ActiveAutomationLimitError) {
      return jsonError("PLAN_AUTOMATION_LIMIT", error.message, 403);
    }
    throw error;
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const originError = assertSameOrigin(request);
  if (originError) {
    return originError;
  }
  const user = await requireUser();
  if (!user) {
    return jsonError("UNAUTHORIZED", "You need to sign in to continue.", 401);
  }

  const { id } = await context.params;
  const ws = await loadWorkspace(user);
  const existing = await getAccessibleAutomation(ws, id);
  if (!existing) {
    return jsonError("NOT_FOUND", "Automation not found.", 404);
  }

  await prisma.automation.delete({ where: { id } });
  return jsonOk({ deleted: true });
}
