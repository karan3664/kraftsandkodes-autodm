import { describe, expect, it } from "vitest";
import { toMediaPickerItem } from "./instagram-media";

describe("media picker data", () => {
  it("exposes thumbnail, caption, type, permalink, and published date", () => {
    expect(
      toMediaPickerItem({
        id: "row_1",
        instagramMediaId: "media_train_reel",
        mediaType: "REELS",
        caption: "Train ka link chahiye?",
        thumbnailUrl: "https://cdn.example/thumb.jpg",
        permalink: "https://instagram.com/reel/train",
        publishedAt: null,
        timestamp: new Date("2026-09-28T10:00:00.000Z"),
        likeCount: 76,
        commentsCount: 8,
        commentsEnabled: true,
      }),
    ).toEqual({
      id: "row_1",
      instagramMediaId: "media_train_reel",
      mediaType: "REELS",
      caption: "Train ka link chahiye?",
      thumbnailUrl: "https://cdn.example/thumb.jpg",
      permalink: "https://instagram.com/reel/train",
      publishedAt: "2026-09-28T10:00:00.000Z",
      likeCount: 76,
      commentsCount: 8,
      commentsEnabled: true,
      syncedAt: null,
    });
  });
});
