export const INSTAGRAM_SCOPES = [
  "instagram_business_basic",
  "instagram_business_manage_comments",
  "instagram_business_manage_messages",
] as const;

export type InstagramScope = (typeof INSTAGRAM_SCOPES)[number];

export type InstagramConfig = {
  appId: string;
  appSecret: string;
  redirectUri: string;
  apiVersion: string;
  graphBaseUrl: string;
  authorizeUrl: string;
  oauthTokenUrl: string;
};

export type InstagramProfile = {
  id: string;
  username: string;
  name?: string;
  profilePictureUrl?: string;
  accountType?: string;
  biography?: string;
  website?: string;
  followersCount?: number;
  followsCount?: number;
  mediaCount?: number;
};

export type InstagramMedia = {
  id: string;
  caption?: string;
  mediaType?: string;
  permalink?: string;
  thumbnailUrl?: string;
  mediaUrl?: string;
  timestamp?: string;
  likeCount?: number;
  commentsCount?: number;
  commentsEnabled?: boolean;
};

export type InstagramComment = {
  id: string;
  text: string;
  username?: string;
  timestamp?: string;
};

export type PrivateReplyResult = {
  recipientId?: string;
  messageId?: string;
};

export type WebhookSubscriptionResult = {
  success: boolean;
  subscribedFields: string[];
  errorMessage?: string;
};

export type TokenSet = {
  accessToken: string;
  expiresAt?: Date;
  tokenType?: string;
};

export interface InstagramClient {
  getAuthorizationUrl(state: string): string;
  exchangeCode(code: string): Promise<TokenSet>;
  refreshToken(accessToken: string): Promise<TokenSet>;
  getProfile(accessToken: string): Promise<InstagramProfile>;
  getMedia(accessToken: string, userId?: string): Promise<InstagramMedia[]>;
  getComments(
    accessToken: string,
    mediaId: string,
  ): Promise<InstagramComment[]>;
  sendPrivateReply(input: {
    accessToken: string;
    instagramUserId: string;
    commentId: string;
    text: string;
  }): Promise<PrivateReplyResult>;
  sendDirectMessage(input: {
    accessToken: string;
    instagramUserId: string;
    recipientId: string;
    text: string;
  }): Promise<PrivateReplyResult>;
  followsBusiness(accessToken: string, commenterId: string): Promise<boolean>;
  replyToComment(input: {
    accessToken: string;
    commentId: string;
    text: string;
  }): Promise<void>;
  subscribeWebhooks(input: {
    accessToken: string;
    fields?: string[];
  }): Promise<WebhookSubscriptionResult>;
  revokeAccess(accessToken: string): Promise<void>;
}

/** Raw Meta error fields kept for diagnostics. Never contains tokens. */
export type GraphErrorDetails = {
  code?: number;
  subcode?: number;
  type?: string;
  message?: string;
};

export class InstagramApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly type?: string;
  readonly graph?: GraphErrorDetails;

  constructor(
    message: string,
    status: number,
    code = "INSTAGRAM_API_ERROR",
    type?: string,
    graph?: GraphErrorDetails,
  ) {
    super(message);
    this.name = "InstagramApiError";
    this.status = status;
    this.code = code;
    this.type = type;
    this.graph = graph;
  }
}
