import { NextRequest } from "next/server";
import { loginUser, signupUser, AuthError } from "@/lib/auth/service";
import { prismaAuthStore } from "@/lib/auth/store";
import { setSessionCookie } from "@/lib/auth/session";
import { assertSameOrigin } from "@/lib/csrf";
import { jsonError, jsonOk, readJson } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import type { LoginInput, SignupInput } from "@kdl/shared";

export async function handleAuth(
  request: NextRequest,
  mode: "login" | "signup",
) {
  const originError = assertSameOrigin(request);
  if (originError) {
    return originError;
  }

  const ip = request.headers.get("x-forwarded-for") ?? "local";
  const limited = await rateLimit(`auth:${mode}:${ip}`, 10, 60_000);
  if (!limited.ok) {
    return jsonError(
      "RATE_LIMITED",
      "Too many attempts. Try again shortly.",
      429,
    );
  }

  try {
    const body = await readJson<SignupInput | LoginInput>(request);
    const result =
      mode === "signup"
        ? await signupUser(prismaAuthStore, body as SignupInput)
        : await loginUser(prismaAuthStore, body as LoginInput);
    await setSessionCookie(result.token, result.expiresAt);
    return jsonOk({ user: result.user });
  } catch (error) {
    if (error instanceof AuthError) {
      return jsonError(error.code, error.message, error.status);
    }
    return jsonError(
      "VALIDATION_ERROR",
      "Check your details and try again.",
      400,
    );
  }
}
