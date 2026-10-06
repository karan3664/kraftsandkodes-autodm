import { requireUser } from "@/lib/auth/session";
import { assertSameOrigin } from "@/lib/csrf";
import { jsonError, jsonOk, readJson } from "@/lib/http";
import { TeamError, acceptInvite, declineInvite } from "@/lib/team/service";

type RouteContext = { params: Promise<{ token: string }> };

function teamFail(error: unknown) {
  if (error instanceof TeamError) {
    const status =
      error.code === "FORBIDDEN"
        ? 403
        : error.code === "NOT_FOUND" || error.code === "EXPIRED"
          ? 404
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
  const { token } = await context.params;
  if (!/^[0-9a-f]{64}$/i.test(token)) {
    return jsonError("NOT_FOUND", "This invitation is not valid.", 404);
  }
  const body = await readJson<{ action?: string }>(request).catch(
    () => ({}) as { action?: string },
  );
  try {
    if (body.action === "decline") {
      const user = await requireUser();
      return jsonOk(await declineInvite(token, user?.email));
    }
    if (body.action === "accept") {
      const user = await requireUser();
      if (!user) {
        return jsonError(
          "UNAUTHORIZED",
          "Sign in with the invited email to accept.",
          401,
        );
      }
      return jsonOk(await acceptInvite(token, user));
    }
    return jsonError("VALIDATION_ERROR", "Unknown invitation action.", 400);
  } catch (error) {
    return teamFail(error);
  }
}
