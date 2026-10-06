import type { InstagramConfig } from "./types";

export function createInstagramConfig(env: {
  META_APP_ID?: string;
  META_APP_SECRET?: string;
  META_REDIRECT_URI?: string;
  META_API_VERSION?: string;
  META_GRAPH_BASE_URL?: string;
  META_AUTHORIZE_URL?: string;
  META_OAUTH_TOKEN_URL?: string;
}): InstagramConfig {
  return {
    appId: env.META_APP_ID ?? "",
    appSecret: env.META_APP_SECRET ?? "",
    redirectUri: env.META_REDIRECT_URI ?? "",
    apiVersion: env.META_API_VERSION ?? "v23.0",
    graphBaseUrl: env.META_GRAPH_BASE_URL ?? "https://graph.instagram.com",
    authorizeUrl:
      env.META_AUTHORIZE_URL ?? "https://www.instagram.com/oauth/authorize",
    oauthTokenUrl:
      env.META_OAUTH_TOKEN_URL ??
      "https://api.instagram.com/oauth/access_token",
  };
}

export function isInstagramConfigured(config: InstagramConfig): boolean {
  return Boolean(config.appId && config.appSecret && config.redirectUri);
}
