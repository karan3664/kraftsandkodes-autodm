import {
  instagramErrorFromGraph,
  missingBusinessScopes,
  readShortLivedToken,
  stripAuthorizationCode,
} from "./meta-errors";
import {
  INSTAGRAM_SCOPES,
  InstagramApiError,
  type InstagramClient,
  type InstagramConfig,
  type InstagramMedia,
  type InstagramProfile,
  type PrivateReplyResult,
  type TokenSet,
  type WebhookSubscriptionResult,
} from "./types";

type GraphErrorBody = {
  error?: {
    message?: string;
    type?: string;
    code?: number;
    error_subcode?: number;
  };
};

function graphUrl(config: InstagramConfig, path: string): URL {
  const base = config.graphBaseUrl.replace(/\/$/, "");
  const version = config.apiVersion.replace(/^\//, "");
  return new URL(`${base}/${version}/${path.replace(/^\//, "")}`);
}

function graphHostUrl(config: InstagramConfig, path: string): URL {
  const base = config.graphBaseUrl.replace(/\/$/, "");
  return new URL(`${base}/${path.replace(/^\//, "")}`);
}

async function parseJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new InstagramApiError(
      "Instagram returned a non-JSON response.",
      response.status,
    );
  }
}

function assertNoGraphError(body: unknown, status: number): void {
  const maybe = body as GraphErrorBody | null;
  if (maybe?.error) {
    throw instagramErrorFromGraph(status, maybe.error);
  }
}

async function graphGet(
  config: InstagramConfig,
  path: string,
  accessToken: string,
  search?: Record<string, string>,
): Promise<unknown> {
  const url = graphUrl(config, path);
  url.searchParams.set("access_token", accessToken);
  for (const [key, value] of Object.entries(search ?? {})) {
    url.searchParams.set(key, value);
  }
  const response = await fetch(url, { method: "GET" });
  const body = await parseJson(response);
  if (!response.ok) {
    assertNoGraphError(body, response.status);
    throw new InstagramApiError("Instagram request failed.", response.status);
  }
  assertNoGraphError(body, response.status);
  return body;
}

async function graphPost(
  config: InstagramConfig,
  path: string,
  accessToken: string,
  payload: unknown,
): Promise<unknown> {
  const url = graphUrl(config, path);
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const body = await parseJson(response);
  if (!response.ok) {
    assertNoGraphError(body, response.status);
    throw new InstagramApiError("Instagram request failed.", response.status);
  }
  assertNoGraphError(body, response.status);
  return body;
}

export class GraphInstagramClient implements InstagramClient {
  constructor(private readonly config: InstagramConfig) {}

  getAuthorizationUrl(state: string): string {
    const url = new URL(this.config.authorizeUrl);
    // Instagram API with Instagram Login — not Facebook Login.
    // Without enable_fb_login=0 Meta often shows "Request parameters are invalid".
    url.searchParams.set("client_id", this.config.appId);
    url.searchParams.set("redirect_uri", this.config.redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", INSTAGRAM_SCOPES.join(","));
    url.searchParams.set("state", state);
    url.searchParams.set("enable_fb_login", "0");
    url.searchParams.set("force_authentication", "1");
    return url.toString();
  }

  async exchangeCode(code: string): Promise<TokenSet> {
    const form = new URLSearchParams({
      client_id: this.config.appId,
      client_secret: this.config.appSecret,
      grant_type: "authorization_code",
      redirect_uri: this.config.redirectUri,
      code: stripAuthorizationCode(code),
    });

    const shortLivedResponse = await fetch(this.config.oauthTokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form,
    });
    const shortLivedBody = await parseJson(shortLivedResponse);
    const shortLived = readShortLivedToken(shortLivedBody);
    if (!shortLivedResponse.ok || !shortLived) {
      const rejected = shortLivedBody as {
        error_message?: string;
        error_type?: string;
        code?: number;
        error?: {
          message?: string;
          type?: string;
          code?: number;
          error_subcode?: number;
        };
      } | null;
      if (rejected?.error) {
        throw instagramErrorFromGraph(
          shortLivedResponse.status || 400,
          rejected.error,
        );
      }
      const oauthMessage = rejected?.error_message?.trim();
      throw new InstagramApiError(
        oauthMessage
          ? `Instagram login failed: ${oauthMessage.slice(0, 160)}`
          : "Failed to exchange Instagram authorization code.",
        shortLivedResponse.status || 400,
        "OAUTH_EXCHANGE_FAILED",
        rejected?.error_type,
        {
          code: rejected?.code,
          type: rejected?.error_type,
          message: oauthMessage,
        },
      );
    }

    const missing = missingBusinessScopes(shortLived.permissions);
    if (missing.length > 0) {
      throw new InstagramApiError(
        "Instagram permissions are missing.",
        403,
        "PERMISSION_DENIED",
      );
    }

    return this.exchangeLongLivedToken(shortLived.accessToken);
  }

  async refreshToken(accessToken: string): Promise<TokenSet> {
    const url = graphHostUrl(this.config, "refresh_access_token");
    url.searchParams.set("grant_type", "ig_refresh_token");
    url.searchParams.set("access_token", accessToken);
    const response = await fetch(url, { method: "GET" });
    const body = (await parseJson(response)) as {
      access_token?: string;
      expires_in?: number;
      token_type?: string;
    } | null;
    if (!response.ok || !body?.access_token) {
      assertNoGraphError(body, response.status);
      throw new InstagramApiError(
        "Failed to refresh Instagram token.",
        response.status,
      );
    }
    return {
      accessToken: body.access_token,
      tokenType: body.token_type,
      expiresAt: body.expires_in
        ? new Date(Date.now() + body.expires_in * 1000)
        : undefined,
    };
  }

  async getProfile(accessToken: string): Promise<InstagramProfile> {
    const fields =
      "user_id,username,name,profile_picture_url,account_type,biography,website,followers_count,follows_count,media_count";
    let body: {
      user_id?: string;
      id?: string;
      username?: string;
      name?: string;
      profile_picture_url?: string;
      account_type?: string;
      biography?: string;
      website?: string;
      followers_count?: number;
      follows_count?: number;
      media_count?: number;
    };
    try {
      body = (await graphGet(this.config, "me", accessToken, {
        fields,
      })) as typeof body;
    } catch (error) {
      // Some IG accounts reject optional fields; retry the minimum needed to connect.
      if (!(error instanceof InstagramApiError) || error.status !== 400) {
        throw error;
      }
      body = (await graphGet(this.config, "me", accessToken, {
        fields: "user_id,username,profile_picture_url,account_type",
      })) as typeof body;
    }

    const id = body.user_id ?? body.id;
    if (!id || !body.username) {
      throw new InstagramApiError("Instagram profile was incomplete.", 502);
    }

    return {
      id,
      username: body.username,
      name: body.name,
      profilePictureUrl: body.profile_picture_url,
      accountType: body.account_type,
      biography: body.biography,
      website: body.website,
      followersCount: body.followers_count,
      followsCount: body.follows_count,
      mediaCount: body.media_count,
    };
  }

  async getMedia(accessToken: string, userId = "me") {
    const first = graphUrl(this.config, `${userId}/media`);
    first.searchParams.set("access_token", accessToken);
    first.searchParams.set(
      "fields",
      "id,caption,media_type,media_product_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count,is_comment_enabled",
    );
    first.searchParams.set("limit", "25");

    const collected: InstagramMedia[] = [];
    let nextUrl: string | null = first.toString();
    while (nextUrl && collected.length < 50) {
      const response = await fetch(nextUrl);
      const body = (await parseJson(response)) as {
        data?: Array<{
          id: string;
          caption?: string;
          media_type?: string;
          media_product_type?: string;
          media_url?: string;
          thumbnail_url?: string;
          permalink?: string;
          timestamp?: string;
          like_count?: number;
          comments_count?: number;
          is_comment_enabled?: boolean;
        }>;
        paging?: { next?: string };
      } | null;
      if (!response.ok) {
        assertNoGraphError(body, response.status);
        throw new InstagramApiError(
          "Could not load Instagram media.",
          response.status,
        );
      }
      for (const item of body?.data ?? []) {
        collected.push({
          id: item.id,
          caption: item.caption,
          mediaType: resolveMediaType(item.media_type, item.media_product_type),
          permalink: item.permalink,
          thumbnailUrl: item.thumbnail_url ?? item.media_url,
          mediaUrl: item.media_url,
          timestamp: item.timestamp,
          likeCount: item.like_count,
          commentsCount: item.comments_count,
          commentsEnabled: item.is_comment_enabled,
        });
      }
      nextUrl = body?.paging?.next ?? null;
    }
    return collected;
  }

  async getComments(accessToken: string, mediaId: string) {
    const body = (await graphGet(
      this.config,
      `${mediaId}/comments`,
      accessToken,
      {
        fields: "id,text,username,timestamp",
      },
    )) as {
      data?: Array<{
        id: string;
        text?: string;
        username?: string;
        timestamp?: string;
      }>;
    };

    return (body.data ?? []).map((item) => ({
      id: item.id,
      text: item.text ?? "",
      username: item.username,
      timestamp: item.timestamp,
    }));
  }

  /**
   * Official Instagram Login private reply:
   * POST https://graph.instagram.com/{version}/{IG_USER_ID}/messages
   * Body: { recipient: { comment_id }, message: { text } }
   * Permissions: instagram_business_basic, instagram_business_manage_comments.
   * One message per commenter, within 7 days of the comment (live: during the broadcast only).
   */
  async sendPrivateReply(input: {
    accessToken: string;
    instagramUserId: string;
    commentId: string;
    text: string;
  }): Promise<PrivateReplyResult> {
    const body = (await graphPost(
      this.config,
      `${input.instagramUserId}/messages`,
      input.accessToken,
      {
        recipient: { comment_id: input.commentId },
        message: { text: input.text },
      },
    )) as { recipient_id?: string; message_id?: string };

    return {
      recipientId: body.recipient_id,
      messageId: body.message_id,
    };
  }

  /**
   * Send API reply inside the 24h window the person opened by messaging us.
   * POST /{IG_USER_ID}/messages  { recipient: { id: IGSID }, message: { text } }
   */
  async sendDirectMessage(input: {
    accessToken: string;
    instagramUserId: string;
    recipientId: string;
    text: string;
  }): Promise<PrivateReplyResult> {
    const body = (await graphPost(
      this.config,
      `${input.instagramUserId}/messages`,
      input.accessToken,
      {
        recipient: { id: input.recipientId },
        message: { text: input.text },
      },
    )) as { recipient_id?: string; message_id?: string };
    return { recipientId: body.recipient_id, messageId: body.message_id };
  }

  /**
   * Instagram Messaging user profile. Meta only answers (error 230 otherwise)
   * after the person has messaged the account.
   * GET /{IGSID}?fields=is_user_follow_business
   * True only when Meta says this person follows the professional account.
   */
  async followsBusiness(
    accessToken: string,
    commenterId: string,
  ): Promise<boolean> {
    const body = (await graphGet(this.config, commenterId, accessToken, {
      fields: "is_user_follow_business",
    })) as { is_user_follow_business?: boolean };
    if (typeof body.is_user_follow_business !== "boolean") {
      throw new InstagramApiError(
        "Could not confirm whether this account follows you.",
        502,
        "FOLLOW_CHECK_FAILED",
      );
    }
    return body.is_user_follow_business;
  }

  /**
   * Public reply on the comment.
   * POST /{ig-comment-id}/replies?message=
   */
  async replyToComment(input: {
    accessToken: string;
    commentId: string;
    text: string;
  }): Promise<void> {
    const url = graphUrl(this.config, `${input.commentId}/replies`);
    url.searchParams.set("message", input.text);
    const response = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${input.accessToken}` },
    });
    const body = await parseJson(response);
    if (!response.ok) {
      assertNoGraphError(body, response.status);
      throw new InstagramApiError("Instagram request failed.", response.status);
    }
    assertNoGraphError(body, response.status);
  }

  async subscribeWebhooks(input: {
    accessToken: string;
    fields?: string[];
  }): Promise<WebhookSubscriptionResult> {
    const fields = input.fields ?? ["comments"];
    try {
      const url = graphUrl(this.config, "me/subscribed_apps");
      url.searchParams.set("subscribed_fields", fields.join(","));
      const response = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${input.accessToken}` },
      });
      const body = await parseJson(response);
      if (!response.ok) {
        assertNoGraphError(body, response.status);
        throw new InstagramApiError(
          "Webhook subscription failed.",
          response.status,
        );
      }
      return { success: true, subscribedFields: fields };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Webhook subscription failed.";
      return { success: false, subscribedFields: [], errorMessage: message };
    }
  }

  async revokeAccess(accessToken: string): Promise<void> {
    const url = graphUrl(this.config, "me/permissions");
    const response = await fetch(url, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) {
      const body = await parseJson(response);
      assertNoGraphError(body, response.status);
      throw new InstagramApiError(
        "Could not revoke Instagram access.",
        response.status,
      );
    }
  }

  private async exchangeLongLivedToken(
    shortLivedToken: string,
  ): Promise<TokenSet> {
    const url = graphHostUrl(this.config, "access_token");
    url.searchParams.set("grant_type", "ig_exchange_token");
    url.searchParams.set("client_secret", this.config.appSecret);
    url.searchParams.set("access_token", shortLivedToken);
    // Meta docs use GET; some apps also accept POST. Try GET then POST.
    let response = await fetch(url, { method: "GET" });
    let body = (await parseJson(response)) as {
      access_token?: string;
      expires_in?: number;
      token_type?: string;
      error?: { message?: string };
    } | null;

    if (!body?.access_token) {
      response = await fetch(graphHostUrl(this.config, "access_token"), {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "ig_exchange_token",
          client_secret: this.config.appSecret,
          access_token: shortLivedToken,
        }),
      });
      body = (await parseJson(response)) as {
        access_token?: string;
        expires_in?: number;
        token_type?: string;
      } | null;
    }

    if (!response.ok || !body?.access_token) {
      // Keep short-lived token so Connect can finish; refresh cron upgrades later.
      // Meta often returns IGApiException "Unsupported request - method type: get"
      // for accounts that are not testers / lack Advanced Access.
      return {
        accessToken: shortLivedToken,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      };
    }

    return {
      accessToken: body.access_token,
      tokenType: body.token_type,
      expiresAt: body.expires_in
        ? new Date(Date.now() + body.expires_in * 1000)
        : undefined,
    };
  }
}

function resolveMediaType(mediaType?: string, productType?: string): string {
  if (productType === "REELS") {
    return "REELS";
  }
  if (productType === "STORY") {
    return "STORY";
  }
  return mediaType ?? "UNKNOWN";
}
