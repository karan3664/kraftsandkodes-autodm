import { requireUser } from "@/lib/auth/session";
import { assertSameOrigin } from "@/lib/csrf";
import { jsonError, jsonOk, readJson } from "@/lib/http";
import { loadWorkspace } from "@/lib/team/workspace";
import {
  TeamError,
  assignAccounts,
  cancelInvite,
  changeRole,
  removeMember,
  resendInvite,
} from "@/lib/team/service";

type RouteContext = { params: Promise<{ id: string }> };

function teamFail(error: unknown) {
  if (error instanceof TeamError) {
    const status =
      error.code === "FORBIDDEN"
        ? 403
        : error.code === "NOT_FOUND"
          ? 404
          : error.code === "PLAN_TEAM_LIMIT" ||
              error.code === "PLAN_TEAM_REQUIRED"
            ? 403
            : 400;
    return jsonError(error.code, error.message, status);
  }
  throw error;
}

export async function POST(request: Request, context: RouteContext) {
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
  const body = await readJson<{
    action?: string;
    role?: "admin" | "member";
    accountIds?: string[];
  }>(request).catch(
    () =>
      ({}) as {
        action?: string;
        role?: "admin" | "member";
        accountIds?: string[];
      },
  );
  try {
    if (body.action === "role") {
      return jsonOk(
        await changeRole(ws, id, body.role === "admin" ? "admin" : "member"),
      );
    }
    if (body.action === "remove") {
      return jsonOk(await removeMember(ws, id));
    }
    if (body.action === "cancel") {
      return jsonOk(await cancelInvite(ws, id));
    }
    if (body.action === "resend") {
      return jsonOk(await resendInvite(ws, id));
    }
    if (body.action === "assign") {
      return jsonOk(
        await assignAccounts(
          ws,
          id,
          Array.isArray(body.accountIds) ? body.accountIds : [],
        ),
      );
    }
    return jsonError("VALIDATION_ERROR", "Unknown team action.", 400);
  } catch (error) {
    return teamFail(error);
  }
}
