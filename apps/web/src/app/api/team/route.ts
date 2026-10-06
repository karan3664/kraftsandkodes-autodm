import { requireUser } from "@/lib/auth/session";
import { assertSameOrigin } from "@/lib/csrf";
import { jsonError, jsonOk, readJson } from "@/lib/http";
import { loadWorkspace } from "@/lib/team/workspace";
import { TeamError, inviteMember, listTeam } from "@/lib/team/service";

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

export async function GET() {
  const user = await requireUser();
  if (!user) {
    return jsonError("UNAUTHORIZED", "You need to sign in to continue.", 401);
  }
  const ws = await loadWorkspace(user);
  if (!ws.canTeam) {
    return jsonError("FORBIDDEN", "You cannot manage this team.", 403);
  }
  return jsonOk(await listTeam(ws));
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
  const ws = await loadWorkspace(user);
  const body = await readJson<{
    email?: string;
    role?: "admin" | "member";
  }>(request).catch(
    () => ({}) as { email?: string; role?: "admin" | "member" },
  );
  try {
    const invited = await inviteMember(ws, {
      email: body.email ?? "",
      role: body.role === "admin" ? "admin" : "member",
    });
    return jsonOk(invited, 201);
  } catch (error) {
    return teamFail(error);
  }
}
