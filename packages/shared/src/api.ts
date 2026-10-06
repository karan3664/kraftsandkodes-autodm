export const API_ERROR_CODES = {
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  RATE_LIMITED: "RATE_LIMITED",
  INSTAGRAM_NOT_CONNECTED: "INSTAGRAM_NOT_CONNECTED",
  INSTAGRAM_TOKEN_EXPIRED: "INSTAGRAM_TOKEN_EXPIRED",
  INSTAGRAM_PERMISSIONS_MISSING: "INSTAGRAM_PERMISSIONS_MISSING",
  WEBHOOK_INACTIVE: "WEBHOOK_INACTIVE",
  MESSAGE_SEND_FAILED: "MESSAGE_SEND_FAILED",
  INSTAGRAM_NOT_CONFIGURED: "INSTAGRAM_NOT_CONFIGURED",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type ApiErrorCode =
  (typeof API_ERROR_CODES)[keyof typeof API_ERROR_CODES];

export type ApiError = {
  code: ApiErrorCode | string;
  message: string;
};

export type ApiSuccess<T> = {
  success: true;
  data: T;
};

export type ApiFailure = {
  success: false;
  error: ApiError;
};

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export function ok<T>(data: T): ApiSuccess<T> {
  return { success: true, data };
}

export function fail(code: ApiError["code"], message: string): ApiFailure {
  return { success: false, error: { code, message } };
}

export const HUMAN_ERRORS = {
  instagramExpired:
    "Instagram connection expired. Please reconnect your account.",
  instagramPermissions: "Instagram permissions are missing.",
  webhookInactive: "Webhook subscription is not active.",
  messageFailed: "Message could not be sent.",
  instagramNotConfigured: "Instagram API is not configured.",
  unauthorized: "You need to sign in to continue.",
} as const;
