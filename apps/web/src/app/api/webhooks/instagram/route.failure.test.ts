import { createHmac } from "node:crypto";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const processIncomingComment = vi.fn();

vi.mock("@/lib/automation/engine", () => ({
  processIncomingComment: (...args: unknown[]) =>
    processIncomingComment(...args),
}));

describe("instagram webhook processing acknowledgement", () => {
  beforeEach(() => {
    process.env.INSTAGRAM_MOCK_MODE = "false";
    process.env.NODE_ENV = "test";
    process.env.META_APP_SECRET = "secret";
    processIncomingComment.mockReset();
  });

  it("returns 500 when processing fails and does not report success", async () => {
    processIncomingComment.mockRejectedValue(new Error("database down"));
    const { POST } = await import("./route");
    const body = JSON.stringify({
      entry: [
        {
          id: "ig_user",
          time: 10,
          changes: [
            {
              field: "comments",
              value: {
                id: "comment_1",
                text: "TRAIN",
                media: { id: "media_train_reel" },
                from: { id: "user", username: "tester" },
              },
            },
          ],
        },
      ],
    });
    const signature = `sha256=${createHmac("sha256", "secret").update(body).digest("hex")}`;
    const response = await POST(
      new NextRequest("http://localhost:3000/api/webhooks/instagram", {
        method: "POST",
        headers: {
          "x-hub-signature-256": signature,
          "content-type": "application/json",
        },
        body,
      }),
    );
    expect(response.status).toBe(500);
    const payload = (await response.json()) as { success: boolean };
    expect(payload.success).toBe(false);
    expect(processIncomingComment).toHaveBeenCalledWith(
      expect.objectContaining({
        instagramUserId: "ig_user",
        instagramMediaId: "media_train_reel",
        commentId: "comment_1",
        commentText: "TRAIN",
      }),
    );
  });
});
