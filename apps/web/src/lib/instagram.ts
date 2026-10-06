import {
  createInstagramClient,
  createInstagramConfig,
  isInstagramConfigured,
  type InstagramProfile,
} from "@kdl/instagram";
import { decryptSecret } from "@kdl/shared/crypto";
import { getEnv, isMockMode } from "./env";

export function getInstagramClient(redirectUri?: string) {
  const env = getEnv();
  return createInstagramClient({
    INSTAGRAM_MOCK_MODE: isMockMode() ? "true" : "false",
    NODE_ENV: env.NODE_ENV,
    META_APP_ID: env.META_APP_ID,
    META_APP_SECRET: env.META_APP_SECRET,
    META_REDIRECT_URI:
      redirectUri ||
      env.META_REDIRECT_URI ||
      `${env.APP_URL}/api/instagram/callback`,
    META_API_VERSION: env.META_API_VERSION,
    META_GRAPH_BASE_URL: env.META_GRAPH_BASE_URL,
    META_AUTHORIZE_URL: env.META_AUTHORIZE_URL,
    META_OAUTH_TOKEN_URL: env.META_OAUTH_TOKEN_URL,
  });
}

/** Live IG counts for the connected account. Null if the token/Graph call fails. */
export async function getConnectedInstagramProfile(
  accessTokenEncrypted: string,
): Promise<InstagramProfile | null> {
  try {
    const accessToken = decryptSecret(
      accessTokenEncrypted,
      getEnv().TOKEN_ENCRYPTION_KEY,
    );
    return await getInstagramClient().getProfile(accessToken);
  } catch {
    return null;
  }
}

export function getInstagramStatus() {
  if (isMockMode()) {
    return { configured: true, mock: true };
  }
  const env = getEnv();
  return {
    configured: isInstagramConfigured(createInstagramConfig(env)),
    mock: false,
  };
}
