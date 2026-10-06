import { requireUser } from "@/lib/auth/session";
import { getAccessibleInstagramAccount } from "@/lib/auth/ownership";
import { loadWorkspace } from "@/lib/team/workspace";
import { assertSameOrigin } from "@/lib/csrf";
import { jsonError, jsonOk, readJson } from "@/lib/http";
import { setSelectedInstagramCookie } from "@/lib/instagram-selection";

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
  const account = await getAccessibleInstagramAccount(ws, body.accountId);
  if (!account) {
    return jsonError("FORBIDDEN", "That Instagram account is not yours.", 403);
  }
  await setSelectedInstagramCookie(account.id);
  return jsonOk({ selected: account.id });
}
