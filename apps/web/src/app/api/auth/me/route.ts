import { requireUser } from "@/lib/auth/session";
import { jsonError, jsonOk } from "@/lib/http";

export async function GET() {
  const user = await requireUser();
  if (!user) {
    return jsonError("UNAUTHORIZED", "You need to sign in to continue.", 401);
  }
  return jsonOk({ user });
}
