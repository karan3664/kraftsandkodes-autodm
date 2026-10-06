import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { GET, POST } from "./route";

describe("instagram webhook", () => {
  it("handles verification challenge", async () => {
    process.env.META_WEBHOOK_VERIFY_TOKEN = "verify-me";
    process.env.NODE_ENV = "test";
    const response = await GET(
      new NextRequest(
        "http://localhost:3000/api/webhooks/instagram?hub.mode=subscribe&hub.verify_token=verify-me&hub.challenge=12345",
      ),
    );
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("12345");
  });

  it("rejects an invalid signature outside mock mode", async () => {
    process.env.INSTAGRAM_MOCK_MODE = "false";
    process.env.NODE_ENV = "test";
    process.env.META_APP_SECRET = "secret";
    const response = await POST(
      new NextRequest("http://localhost:3000/api/webhooks/instagram", {
        method: "POST",
        headers: {
          "x-hub-signature-256": "sha256=deadbeef",
          "content-type": "application/json",
        },
        body: JSON.stringify({ entry: [] }),
      }),
    );
    expect(response.status).toBe(401);
  });
});
