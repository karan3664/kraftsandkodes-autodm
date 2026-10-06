import {
  InstagramApiError,
  type InstagramClient,
  type InstagramComment,
  type InstagramMedia,
  type InstagramProfile,
  type PrivateReplyResult,
  type TokenSet,
  type WebhookSubscriptionResult,
} from "./types";

export class MockInstagramClient implements InstagramClient {
  replies: Array<{ commentId: string; text: string }> = [];
  directMessages: Array<{ recipientId: string; text: string }> = [];
  following = new Set<string>();

  constructor(
    private readonly options: {
      failExchange?: boolean;
      failReply?: boolean;
      expired?: boolean;
    } = {},
  ) {}

  getAuthorizationUrl(state: string): string {
    return `/api/instagram/callback?code=mock-code&state=${encodeURIComponent(state)}`;
  }

  async exchangeCode(code: string): Promise<TokenSet> {
    if (this.options.failExchange) {
      throw new InstagramApiError(
        "Mock OAuth exchange failed.",
        400,
        "OAUTH_EXCHANGE_FAILED",
      );
    }
    if (code.length === 0) {
      throw new InstagramApiError("Missing authorization code.", 400);
    }
    return {
      accessToken: "mock-access-token",
      expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      tokenType: "bearer",
    };
  }

  async refreshToken(_accessToken: string): Promise<TokenSet> {
    if (this.options.expired) {
      throw new InstagramApiError(
        "Instagram connection expired. Please reconnect your account.",
        401,
        "INVALID_TOKEN",
      );
    }
    return {
      accessToken: "mock-refreshed-token",
      expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
    };
  }

  async getProfile(): Promise<InstagramProfile> {
    return {
      id: "ig_mock_account_001",
      username: "krafts_demo",
      name: "KRAFTSANDKODES Demo",
      accountType: "BUSINESS",
      biography: "Comment LINK for the train URL.",
      website: "https://example.com/train",
      followersCount: 1284,
      followsCount: 96,
      mediaCount: 42,
    };
  }

  async getMedia(): Promise<InstagramMedia[]> {
    return [
      {
        id: "media_train_reel",
        caption: "Train ka link chahiye?",
        mediaType: "REELS",
        permalink: "https://instagram.com/reel/demo-train",
        timestamp: "2026-09-28T10:00:00.000Z",
        likeCount: 76,
        commentsCount: 8,
        commentsEnabled: true,
      },
      {
        id: "media_offer_post",
        caption: "Monday offer — comment OFFER",
        mediaType: "IMAGE",
        permalink: "https://instagram.com/p/demo-offer",
        timestamp: "2026-09-20T08:30:00.000Z",
      },
      {
        id: "media_guide_reel",
        caption: "Comment LINK for the guide",
        mediaType: "REELS",
        permalink: "https://instagram.com/reel/demo-guide",
        timestamp: "2026-09-12T18:15:00.000Z",
      },
    ];
  }

  async getComments(): Promise<InstagramComment[]> {
    return [{ id: "test-comment-001", text: "TRAIN", username: "test_user" }];
  }

  async sendPrivateReply(_input: {
    accessToken: string;
    instagramUserId: string;
    commentId: string;
    text: string;
  }): Promise<PrivateReplyResult> {
    if (this.options.failReply || this.options.expired) {
      throw new InstagramApiError(
        this.options.expired
          ? "Instagram connection expired. Please reconnect your account."
          : "Message could not be sent.",
        this.options.expired ? 401 : 500,
        this.options.expired ? "INVALID_TOKEN" : "MESSAGE_SEND_FAILED",
      );
    }
    return {
      recipientId: "igsid_mock_user",
      messageId: `mock_msg_${_input.commentId}`,
    };
  }

  async sendDirectMessage(input: {
    accessToken: string;
    instagramUserId: string;
    recipientId: string;
    text: string;
  }): Promise<PrivateReplyResult> {
    this.directMessages.push({
      recipientId: input.recipientId,
      text: input.text,
    });
    return { recipientId: input.recipientId, messageId: "mock_dm" };
  }

  async followsBusiness(
    _accessToken: string,
    commenterId: string,
  ): Promise<boolean> {
    return this.following.has(commenterId);
  }

  async replyToComment(input: {
    accessToken: string;
    commentId: string;
    text: string;
  }): Promise<void> {
    this.replies.push({ commentId: input.commentId, text: input.text });
  }

  async subscribeWebhooks(): Promise<WebhookSubscriptionResult> {
    return { success: true, subscribedFields: ["comments", "messages"] };
  }

  async revokeAccess(): Promise<void> {
    return undefined;
  }
}
