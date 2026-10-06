import { describe, expect, it } from "vitest";
import {
  classifyGraphError,
  missingBusinessScopes,
  readShortLivedToken,
  stripAuthorizationCode,
} from "../src/meta-errors";

describe("Instagram Login helpers", () => {
  it("strips the #_ suffix Meta appends to authorization codes", () => {
    expect(stripAuthorizationCode("abc123#_")).toBe("abc123");
  });

  it("reads the documented short-lived token response", () => {
    expect(
      readShortLivedToken({
        data: [
          {
            access_token: "short",
            user_id: "1020",
            permissions:
              "instagram_business_basic,instagram_business_manage_comments,instagram_business_manage_messages",
          },
        ],
      }),
    ).toMatchObject({ accessToken: "short", userId: "1020" });
  });

  it("accepts permissions as an array", () => {
    expect(
      readShortLivedToken({
        access_token: "short",
        user_id: 1020,
        permissions: [
          "instagram_business_basic",
          "instagram_business_manage_comments",
          "instagram_business_manage_messages",
        ],
      })?.permissions,
    ).toBe(
      "instagram_business_basic,instagram_business_manage_comments,instagram_business_manage_messages",
    );
    expect(
      missingBusinessScopes([
        "instagram_business_basic",
        "instagram_business_manage_comments",
        "instagram_business_manage_messages",
      ]),
    ).toEqual([]);
  });

  it("reports missing business permissions", () => {
    expect(missingBusinessScopes("instagram_business_basic")).toEqual([
      "instagram_business_manage_comments",
      "instagram_business_manage_messages",
    ]);
  });

  it("maps Meta error codes without returning the raw message", () => {
    expect(
      classifyGraphError(400, { code: 190, message: "token EAAGsecret" }),
    ).toEqual({
      code: "INVALID_TOKEN",
      message: "Instagram connection expired. Please reconnect your account.",
    });
    expect(
      classifyGraphError(403, { code: 10, message: "permission" }).code,
    ).toBe("PERMISSION_DENIED");
    expect(
      classifyGraphError(400, {
        message: "The comment is invalid for a private reply",
      }).code,
    ).toBe("COMMENT_NOT_ELIGIBLE");
    expect(
      classifyGraphError(400, { error_subcode: 2534022, message: "window" })
        .code,
    ).toBe("MESSAGE_WINDOW_EXPIRED");
    expect(
      classifyGraphError(500, {
        message:
          "According policy for private replies, the comment is too old get a reply.",
      }).code,
    ).toBe("MESSAGE_WINDOW_EXPIRED");
    expect(classifyGraphError(429, { code: 613 }).code).toBe("RATE_LIMITED");
    expect(
      classifyGraphError(400, {
        message: "Error validating verification code. Code has been used.",
      }).code,
    ).toBe("OAUTH_CODE_USED");
    expect(
      classifyGraphError(400, {
        message: "Invalid redirect_uri for this oauth client",
      }).code,
    ).toBe("OAUTH_REDIRECT_MISMATCH");
    expect(
      classifyGraphError(400, {
        message: "Unsupported request - method type: get",
        type: "IGApiException",
        code: 100,
      }).code,
    ).toBe("OAUTH_TESTER_REQUIRED");
  });
});
