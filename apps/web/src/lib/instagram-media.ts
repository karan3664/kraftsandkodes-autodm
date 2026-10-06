import { prisma } from "@kdl/db";
import { decryptSecret } from "@kdl/shared/crypto";
import { InstagramApiError } from "@kdl/instagram";
import { getEnv } from "@/lib/env";
import { getInstagramClient } from "@/lib/instagram";

export async function syncAccountMedia(
  userId: string,
  instagramAccountId: string,
) {
  const account = await prisma.instagramAccount.findFirst({
    where: { id: instagramAccountId, userId },
  });
  if (!account) {
    return null;
  }

  const client = getInstagramClient();
  const accessToken = decryptSecret(
    account.accessTokenEncrypted,
    getEnv().TOKEN_ENCRYPTION_KEY,
  );
  const remote = await client.getMedia(accessToken, account.instagramUserId);

  for (const item of remote) {
    await prisma.instagramMedia.upsert({
      where: {
        instagramAccountId_instagramMediaId: {
          instagramAccountId: account.id,
          instagramMediaId: item.id,
        },
      },
      update: {
        mediaType: item.mediaType ?? "UNKNOWN",
        caption: item.caption,
        permalink: item.permalink,
        thumbnailUrl: item.thumbnailUrl,
        mediaUrl: item.mediaUrl,
        publishedAt: item.timestamp ? new Date(item.timestamp) : null,
        timestamp: item.timestamp ? new Date(item.timestamp) : null,
        likeCount: item.likeCount ?? null,
        commentsCount: item.commentsCount ?? null,
        commentsEnabled: item.commentsEnabled ?? null,
        syncedAt: new Date(),
      },
      create: {
        instagramAccountId: account.id,
        instagramMediaId: item.id,
        mediaType: item.mediaType ?? "UNKNOWN",
        caption: item.caption,
        permalink: item.permalink,
        thumbnailUrl: item.thumbnailUrl,
        mediaUrl: item.mediaUrl,
        publishedAt: item.timestamp ? new Date(item.timestamp) : null,
        timestamp: item.timestamp ? new Date(item.timestamp) : null,
        likeCount: item.likeCount ?? null,
        commentsCount: item.commentsCount ?? null,
        commentsEnabled: item.commentsEnabled ?? null,
      },
    });
  }

  return prisma.instagramMedia.findMany({
    where: { instagramAccountId: account.id },
    orderBy: { publishedAt: "desc" },
  });
}

export function mediaSyncErrorMessage(error: unknown): {
  code: string;
  message: string;
  status: number;
} {
  if (
    error instanceof InstagramApiError &&
    (error.status === 401 ||
      error.code === "INVALID_TOKEN" ||
      error.code === "TOKEN_EXPIRED")
  ) {
    return {
      code: "INSTAGRAM_TOKEN_EXPIRED",
      message: "Instagram connection expired. Please reconnect your account.",
      status: 401,
    };
  }
  if (error instanceof InstagramApiError && error.status === 403) {
    return {
      code: "INSTAGRAM_PERMISSIONS_MISSING",
      message: "Instagram permissions are missing.",
      status: 403,
    };
  }
  return {
    code: "INSTAGRAM_NOT_CONFIGURED",
    message: "Instagram media could not be loaded.",
    status: 502,
  };
}

export function toMediaPickerItem(item: {
  id: string;
  instagramMediaId: string;
  mediaType: string;
  caption: string | null;
  thumbnailUrl: string | null;
  permalink: string | null;
  publishedAt: Date | null;
  timestamp: Date | null;
  likeCount?: number | null;
  commentsCount?: number | null;
  commentsEnabled?: boolean | null;
  syncedAt?: Date | null;
}) {
  const published = item.timestamp ?? item.publishedAt;
  return {
    id: item.id,
    instagramMediaId: item.instagramMediaId,
    mediaType: item.mediaType,
    caption: item.caption,
    thumbnailUrl: item.thumbnailUrl,
    permalink: item.permalink,
    publishedAt: published ? published.toISOString() : null,
    likeCount: item.likeCount ?? null,
    commentsCount: item.commentsCount ?? null,
    commentsEnabled: item.commentsEnabled ?? null,
    syncedAt: item.syncedAt ? item.syncedAt.toISOString() : null,
  };
}
