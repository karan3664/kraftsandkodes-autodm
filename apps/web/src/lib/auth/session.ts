import { cookies } from "next/headers";
import { getEnv, isProduction } from "../env";
import { prismaAuthStore } from "./store";
import { getSessionUser } from "./service";

export async function setSessionCookie(token: string, expiresAt: Date) {
  const jar = await cookies();
  jar.set(getEnv().SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction(),
    path: "/",
    expires: expiresAt,
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(getEnv().SESSION_COOKIE_NAME);
}

export async function readSessionToken() {
  const jar = await cookies();
  return jar.get(getEnv().SESSION_COOKIE_NAME)?.value;
}

export async function requireUser() {
  const token = await readSessionToken();
  const user = await getSessionUser(prismaAuthStore, token);
  if (!user) {
    return null;
  }
  return user;
}
