import { getEnv } from "@/lib/env";

export function googleConfigured(): boolean {
  const env = getEnv();
  return Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
}

export function googleRedirectUri(): string {
  return `${getEnv().APP_URL.replace(/\/$/, "")}/api/auth/google/callback`;
}

export function googleAuthorizeUrl(state: string): string {
  const env = getEnv();
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", env.GOOGLE_CLIENT_ID);
  url.searchParams.set("redirect_uri", googleRedirectUri());
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  url.searchParams.set("prompt", "select_account");
  return url.toString();
}

export async function googleProfileFromCode(code: string): Promise<{
  email: string;
  name: string;
}> {
  const env = getEnv();
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: googleRedirectUri(),
      grant_type: "authorization_code",
    }),
  });
  const tokenBody = (await tokenResponse.json()) as {
    access_token?: string;
    error?: string;
  };
  if (!tokenResponse.ok || !tokenBody.access_token) {
    throw new Error(tokenBody.error || "Google token exchange failed.");
  }

  const profileResponse = await fetch(
    "https://openidconnect.googleapis.com/v1/userinfo",
    { headers: { Authorization: `Bearer ${tokenBody.access_token}` } },
  );
  const profile = (await profileResponse.json()) as {
    email?: string;
    email_verified?: boolean;
    name?: string;
    given_name?: string;
  };
  if (!profileResponse.ok || !profile.email) {
    throw new Error("Google profile was missing an email.");
  }
  if (profile.email_verified === false) {
    throw new Error("Google email is not verified.");
  }
  return {
    email: profile.email,
    name: profile.name || profile.given_name || "",
  };
}
