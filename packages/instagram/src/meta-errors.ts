import { InstagramApiError } from "./types";

export function stripAuthorizationCode(code: string): string {
  return code.replace(/#_$/, "").trim();
}

function asPermissionString(permissions: unknown): string | undefined {
  if (typeof permissions === "string") {
    return permissions;
  }
  if (Array.isArray(permissions)) {
    const scopes = permissions.filter(
      (scope): scope is string => typeof scope === "string",
    );
    return scopes.length > 0 ? scopes.join(",") : undefined;
  }
  return undefined;
}

export function readShortLivedToken(body: unknown): {
  accessToken: string;
  userId?: string;
  permissions?: string;
} | null {
  const record = body as {
    access_token?: string;
    user_id?: string | number;
    permissions?: unknown;
    data?: Array<{
      access_token?: string;
      user_id?: string | number;
      permissions?: unknown;
    }>;
  } | null;
  const token = record?.data?.[0] ?? record;
  if (!token?.access_token) {
    return null;
  }
  return {
    accessToken: token.access_token,
    userId: token.user_id === undefined ? undefined : String(token.user_id),
    permissions: asPermissionString(token.permissions),
  };
}

const REQUIRED_SCOPES = [
  "instagram_business_basic",
  "instagram_business_manage_comments",
  "instagram_business_manage_messages",
] as const;

export function missingBusinessScopes(permissions?: unknown): string[] {
  const text = asPermissionString(permissions);
  if (!text) {
    return [];
  }
  const granted = new Set(
    text
      .split(/[,\s]+/)
      .map((scope) => scope.trim())
      .filter(Boolean),
  );
  return REQUIRED_SCOPES.filter((scope) => !granted.has(scope));
}

type GraphError = {
  message?: string;
  code?: number;
  error_subcode?: number;
  type?: string;
};

export function classifyGraphError(
  status: number,
  error?: GraphError,
): { code: string; message: string } {
  const graphCode = error?.code;
  const subcode = error?.error_subcode;
  const text = (error?.message ?? "").toLowerCase();

  if (
    status === 429 ||
    graphCode === 4 ||
    graphCode === 17 ||
    graphCode === 32 ||
    graphCode === 613
  ) {
    return {
      code: "RATE_LIMITED",
      message: "Instagram rate limit reached. Try again later.",
    };
  }
  if (
    status === 401 ||
    graphCode === 190 ||
    graphCode === 102 ||
    graphCode === 463
  ) {
    return {
      code: "INVALID_TOKEN",
      message: "Instagram connection expired. Please reconnect your account.",
    };
  }
  if (
    text.includes("not eligible") ||
    text.includes("invalid for a private reply") ||
    subcode === 2534025
  ) {
    return {
      code: "COMMENT_NOT_ELIGIBLE",
      message: "This comment cannot receive a private reply.",
    };
  }
  if (
    text.includes("outside of allowed window") ||
    text.includes("window has expired") ||
    text.includes("too old") ||
    text.includes("7 days") ||
    subcode === 2534022
  ) {
    return {
      code: "MESSAGE_WINDOW_EXPIRED",
      message: "The private reply window for this comment has expired.",
    };
  }
  if (graphCode === 10 || graphCode === 200 || status === 403) {
    return {
      code: "PERMISSION_DENIED",
      message: "Instagram permissions are missing.",
    };
  }
  if (text.includes("media") && text.includes("does not exist")) {
    return {
      code: "MEDIA_NOT_FOUND",
      message: "Instagram media was not found.",
    };
  }
  if (
    graphCode === 803 ||
    (text.includes("account") && text.includes("does not exist"))
  ) {
    return {
      code: "ACCOUNT_NOT_FOUND",
      message: "Instagram account was not found.",
    };
  }
  if (
    text.includes("redirect_uri") ||
    text.includes("redirect uri") ||
    text.includes("callback url")
  ) {
    return {
      code: "OAUTH_REDIRECT_MISMATCH",
      message: "Instagram redirect URL does not match the Meta app settings.",
    };
  }
  if (
    text.includes("code has been used") ||
    text.includes("authorization code has been used") ||
    text.includes("code was already used") ||
    text.includes("verification code") ||
    text.includes("code has expired") ||
    text.includes("expired code")
  ) {
    return {
      code: "OAUTH_CODE_USED",
      message:
        "That Instagram Allow link was already used. Connect again and tap Allow once.",
    };
  }
  if (
    text.includes("not a business") ||
    text.includes("professional account") ||
    text.includes("convert to a professional") ||
    text.includes("creator or business")
  ) {
    return {
      code: "OAUTH_ACCOUNT_TYPE",
      message: "Use a Creator or Business Instagram account, then tap Allow.",
    };
  }
  if (text.includes("unsupported request") && text.includes("method type")) {
    return {
      code: "OAUTH_TESTER_REQUIRED",
      message:
        "This Instagram account cannot use the API yet. Add it as an Instagram Tester on the Meta app (or publish the app / finish App Review), accept the invite, then connect again.",
    };
  }
  return {
    code: "INSTAGRAM_API_ERROR",
    message: error?.message?.trim()
      ? `Instagram request failed: ${error.message.trim().slice(0, 160)}`
      : "Instagram request failed.",
  };
}

export function instagramErrorFromGraph(
  status: number,
  error?: GraphError,
): InstagramApiError {
  const classified = classifyGraphError(status, error);
  return new InstagramApiError(
    classified.message,
    status,
    classified.code,
    error?.type,
    {
      code: error?.code,
      subcode: error?.error_subcode,
      type: error?.type,
      message: error?.message,
    },
  );
}
