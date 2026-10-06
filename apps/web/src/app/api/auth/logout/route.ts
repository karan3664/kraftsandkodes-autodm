import { logoutUser } from "@/lib/auth/service";
import { prismaAuthStore } from "@/lib/auth/store";
import { clearSessionCookie, readSessionToken } from "@/lib/auth/session";
import { jsonOk } from "@/lib/http";

export async function POST() {
  const token = await readSessionToken();
  await logoutUser(prismaAuthStore, token);
  await clearSessionCookie();
  return jsonOk({ ok: true });
}
