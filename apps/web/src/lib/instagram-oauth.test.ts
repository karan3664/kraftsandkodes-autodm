import { describe, expect, it } from "vitest";
import { oauthCallbackUrl, parseOAuthReturnTo } from "./instagram-oauth-url";

describe("oauthCallbackUrl", () => {
  it("keeps local Instagram OAuth on the current origin", () => {
    const request = {
      nextUrl: new URL("http://localhost:3002/api/instagram/connect"),
      headers: new Headers({ host: "localhost:3002" }),
    };
    expect(oauthCallbackUrl(request)).toBe(
      "http://localhost:3002/api/instagram/callback",
    );
  });

  it("only allows dashboard return paths after Instagram OAuth", () => {
    expect(parseOAuthReturnTo("/dashboard")).toBe("/dashboard");
    expect(parseOAuthReturnTo("/dashboard/instagram")).toBe(
      "/dashboard/instagram",
    );
    expect(parseOAuthReturnTo("https://evil.example/phish")).toBe(
      "/dashboard/instagram",
    );
  });
});
