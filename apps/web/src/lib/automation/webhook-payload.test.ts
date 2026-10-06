import { describe, expect, it } from "vitest";
import { extractComments, extractMessages } from "./webhook-payload";

const commentValue = {
  id: "comment_1",
  text: "TRAIN",
  media: { id: "media_train_reel", media_product_type: "REELS" },
  from: { id: "user_1", username: "tester" },
};

describe("instagram comment webhook payload", () => {
  it("reads the changes array used by Graph webhooks", () => {
    const [event] = extractComments({
      object: "instagram",
      entry: [
        {
          id: "ig_account",
          time: 10,
          changes: [{ field: "comments", value: commentValue }],
        },
      ],
    });
    expect(event).toMatchObject({
      instagramUserId: "ig_account",
      instagramMediaId: "media_train_reel",
      commentId: "comment_1",
      commentText: "TRAIN",
      commenterUsername: "tester",
    });
  });

  it("reads the entry field/value shape from Instagram Login examples", () => {
    const [event] = extractComments({
      object: "instagram",
      entry: [
        { id: "ig_account", time: 10, field: "comments", value: commentValue },
      ],
    });
    expect(event?.instagramMediaId).toBe("media_train_reel");
  });

  it("ignores unsupported webhook fields", () => {
    expect(
      extractComments({
        entry: [
          {
            id: "ig_account",
            time: 10,
            changes: [{ field: "mentions", value: { comment_id: "1" } }],
          },
        ],
      }),
    ).toEqual([]);
  });

  it("reads inbound DMs and drops echoes of our own messages", () => {
    expect(
      extractMessages({
        entry: [
          {
            id: "ig_business",
            messaging: [
              { sender: { id: "igsid_1" }, message: { mid: "m1", text: "Done" } },
              {
                sender: { id: "ig_business" },
                message: { mid: "m2", text: "link", is_echo: true },
              },
            ],
          },
        ],
      }),
    ).toEqual([
      { eventId: "msg:m1", instagramUserId: "ig_business", senderId: "igsid_1" },
    ]);
  });
});
