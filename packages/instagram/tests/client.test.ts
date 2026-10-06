import { describe, expect, it, vi } from "vitest";
import { createInstagramClient } from "../src/index";
import { GraphInstagramClient } from "../src/graph-client";
import { MockInstagramClient } from "../src/mock-client";
import { InstagramApiError } from "../src/types";

const config = {
  appId: "app",
  appSecret: "secret",
  redirectUri: "http://localhost:3000/api/instagram/callback",
  apiVersion: "v23.0",
  graphBaseUrl: "https://graph.instagram.com",
  authorizeUrl: "https://www.instagram.com/oauth/authorize",
  oauthTokenUrl: "https://api.instagram.com/oauth/access_token",
};

describe("MockInstagramClient", () => {
  it("returns a successful private reply", async () => {
    const client = new MockInstagramClient();
    const result = await client.sendPrivateReply({
      accessToken: "mock",
      instagramUserId: "ig_1",
      commentId: "c_1",
      text: "Hello",
    });
    expect(result.messageId).toContain("c_1");
  });

  it("surfaces API errors", async () => {
    const client = new MockInstagramClient({ failReply: true });
    await expect(
      client.sendPrivateReply({
        accessToken: "mock",
        instagramUserId: "ig_1",
        commentId: "c_1",
        text: "Hello",
      }),
    ).rejects.toBeInstanceOf(InstagramApiError);
  });

  it("surfaces expired tokens", async () => {
    const client = new MockInstagramClient({ expired: true });
    await expect(client.refreshToken("x")).rejects.toMatchObject({
      code: "INVALID_TOKEN",
    });
  });
});

describe("GraphInstagramClient", () => {
  it("builds an authorization URL with required scopes only", () => {
    const client = new GraphInstagramClient(config);
    const url = new URL(client.getAuthorizationUrl("abc"));
    expect(url.searchParams.get("client_id")).toBe("app");
    expect(url.searchParams.get("scope")).toBe(
      "instagram_business_basic,instagram_business_manage_comments,instagram_business_manage_messages",
    );
    expect(url.searchParams.get("scope")).not.toContain("content_publish");
    expect(url.searchParams.get("enable_fb_login")).toBe("0");
    expect(url.searchParams.get("force_authentication")).toBe("1");
  });

  it("loads follower and following counts from /me", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          user_id: "1784",
          username: "kraftsandkodes",
          name: "Krafts And Kodes",
          account_type: "BUSINESS",
          biography: "AutoDM demo",
          website: "https://example.com",
          followers_count: 1284,
          follows_count: 96,
          media_count: 42,
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    const profile = await new GraphInstagramClient(config).getProfile("token");
    const url = new URL(String(fetchMock.mock.calls[0]?.[0]));
    expect(url.pathname).toBe("/v23.0/me");
    expect(url.searchParams.get("fields")).toContain("followers_count");
    expect(url.searchParams.get("fields")).toContain("follows_count");
    expect(url.searchParams.get("fields")).toContain("biography");
    expect(profile).toMatchObject({
      id: "1784",
      username: "kraftsandkodes",
      name: "Krafts And Kodes",
      accountType: "BUSINESS",
      biography: "AutoDM demo",
      website: "https://example.com",
      followersCount: 1284,
      followsCount: 96,
      mediaCount: 42,
    });
    vi.unstubAllGlobals();
  });

  it("loads media fields from the official media edge", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [
            {
              id: "1789",
              caption: "Train ka link chahiye?",
              media_type: "VIDEO",
              media_product_type: "REELS",
              thumbnail_url: "https://cdn.example/thumb.jpg",
              media_url: "https://cdn.example/video.mp4",
              permalink: "https://instagram.com/reel/train",
              timestamp: "2026-09-28T10:00:00+0000",
              like_count: 76,
              comments_count: 8,
              is_comment_enabled: true,
            },
          ],
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    const media = await new GraphInstagramClient(config).getMedia(
      "token",
      "ig_user",
    );
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain(
      "/ig_user/media?access_token=token",
    );
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("thumbnail_url");
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("like_count");
    expect(media[0]).toMatchObject({
      id: "1789",
      caption: "Train ka link chahiye?",
      mediaType: "REELS",
      thumbnailUrl: "https://cdn.example/thumb.jpg",
      permalink: "https://instagram.com/reel/train",
      likeCount: 76,
      commentsCount: 8,
      commentsEnabled: true,
    });
    vi.unstubAllGlobals();
  });

  it("posts a private reply to the Instagram user messages edge", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ recipient_id: "igsid", message_id: "m1" }),
        {
          status: 200,
        },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    await new GraphInstagramClient(config).sendPrivateReply({
      accessToken: "token",
      instagramUserId: "ig_user",
      commentId: "comment_1",
      text: "Here's your train link!",
    });
    const [url, init] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(String(url)).toBe(
      "https://graph.instagram.com/v23.0/ig_user/messages",
    );
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual({
      recipient: { comment_id: "comment_1" },
      message: { text: "Here's your train link!" },
    });
    vi.unstubAllGlobals();
  });

  it("checks follow status and posts a public comment reply", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ is_user_follow_business: true }), {
          status: 200,
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: "reply_1" }), { status: 200 }),
      );
    vi.stubGlobal("fetch", fetchMock);
    const client = new GraphInstagramClient(config);
    await expect(client.followsBusiness("token", "igsid_1")).resolves.toBe(
      true,
    );
    await client.replyToComment({
      accessToken: "token",
      commentId: "comment_1",
      text: "@sindhisetu check your dm!",
    });
    const followUrl = new URL(String(fetchMock.mock.calls[0]?.[0]));
    expect(followUrl.pathname).toBe("/v23.0/igsid_1");
    expect(followUrl.searchParams.get("fields")).toBe(
      "is_user_follow_business",
    );
    const replyUrl = new URL(String(fetchMock.mock.calls[1]?.[0]));
    expect(replyUrl.pathname).toBe("/v23.0/comment_1/replies");
    expect(replyUrl.searchParams.get("message")).toBe(
      "@sindhisetu check your dm!",
    );
    vi.unstubAllGlobals();
  });

  it("maps an expired Graph token to INVALID_TOKEN", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ error: { message: "expired", code: 190 } }),
          {
            status: 400,
          },
        ),
      ),
    );
    await expect(
      new GraphInstagramClient(config).sendPrivateReply({
        accessToken: "token",
        instagramUserId: "ig_user",
        commentId: "comment_1",
        text: "Hi",
      }),
    ).rejects.toMatchObject({ code: "INVALID_TOKEN", status: 400 });
    vi.unstubAllGlobals();
  });

  it("exchanges a short-lived code for a long-lived token", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ access_token: "short-lived", user_id: "1" }),
          {
            status: 200,
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ access_token: "long-lived", expires_in: 5184000 }),
          {
            status: 200,
          },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);
    const tokens = await new GraphInstagramClient(config).exchangeCode(
      "auth-code",
    );
    expect(tokens.accessToken).toBe("long-lived");
    expect(fetchMock.mock.calls[0]?.[0]).toBe(config.oauthTokenUrl);
    expect(
      String((fetchMock.mock.calls[0]?.[1] as RequestInit).body),
    ).toContain("code=auth-code");
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain(
      "https://graph.instagram.com/access_token?grant_type=ig_exchange_token",
    );
    expect(String(fetchMock.mock.calls[1]?.[0])).not.toContain(
      "/v23.0/access_token",
    );
    vi.unstubAllGlobals();
  });

  it("reads the documented data array and stops when a required permission is missing", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [
            {
              access_token: "short",
              user_id: "1",
              permissions: "instagram_business_basic",
            },
          ],
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    await expect(
      new GraphInstagramClient(config).exchangeCode("auth-code#_"),
    ).rejects.toMatchObject({ code: "PERMISSION_DENIED" });
    expect(
      String((fetchMock.mock.calls[0]?.[1] as RequestInit).body),
    ).toContain("code=auth-code");
    vi.unstubAllGlobals();
  });
});

describe("createInstagramClient", () => {
  it("refuses mock mode in production", () => {
    expect(() =>
      createInstagramClient({
        INSTAGRAM_MOCK_MODE: "true",
        NODE_ENV: "production",
      }),
    ).toThrow(/production/);
  });
});
