import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";
import { hash } from "bcryptjs";
import { encryptSecret } from "@kdl/shared/crypto";
import { prisma } from "../src/index";

loadEnv({ path: resolve(process.cwd(), "../../.env") });
loadEnv({ path: resolve(process.cwd(), ".env") });

const DEV_EMAIL = "dev@karandigitallabs.com";
const DEV_PASSWORD = "DevPassword123!";

async function main() {
  const encryptionKey = process.env.TOKEN_ENCRYPTION_KEY;
  if (!encryptionKey) {
    throw new Error(
      "TOKEN_ENCRYPTION_KEY is required to seed encrypted mock tokens.",
    );
  }

  const passwordHash = await hash(DEV_PASSWORD, 12);

  const user = await prisma.user.upsert({
    where: { email: DEV_EMAIL },
    update: { name: "Karan Digital Labs Dev", passwordHash },
    create: {
      email: DEV_EMAIL,
      name: "Karan Digital Labs Dev",
      passwordHash,
    },
  });

  const account = await prisma.instagramAccount.upsert({
    where: { instagramUserId: "ig_mock_account_001" },
    update: {
      username: "krafts_demo",
      webhookStatus: "mock",
      accessTokenEncrypted: encryptSecret("mock-access-token", encryptionKey),
    },
    create: {
      userId: user.id,
      instagramUserId: "ig_mock_account_001",
      username: "krafts_demo",
      profilePictureUrl: null,
      accessTokenEncrypted: encryptSecret("mock-access-token", encryptionKey),
      tokenExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      webhookStatus: "mock",
    },
  });

  const media = await prisma.instagramMedia.upsert({
    where: {
      instagramAccountId_instagramMediaId: {
        instagramAccountId: account.id,
        instagramMediaId: "media_train_reel",
      },
    },
    update: {
      caption: "Train ka link chahiye?",
      mediaType: "REELS",
    },
    create: {
      instagramAccountId: account.id,
      instagramMediaId: "media_train_reel",
      mediaType: "REELS",
      caption: "Train ka link chahiye?",
      permalink: "https://instagram.com/reel/demo-train",
      publishedAt: new Date("2026-09-28T10:00:00.000Z"),
      timestamp: new Date("2026-09-28T10:00:00.000Z"),
    },
  });

  const existing = await prisma.automation.findFirst({
    where: { userId: user.id, mediaId: media.id, name: "Train Link" },
  });

  if (!existing) {
    await prisma.automation.create({
      data: {
        userId: user.id,
        instagramAccountId: account.id,
        mediaId: media.id,
        name: "Train Link",
        actionType: "private_reply",
        matchType: "contains",
        caseSensitive: false,
        enabled: true,
        privateReplyMessage: "Hey! 👋 Here's the train link: {LINK}",
        requireFollow: true,
        commentReplyMessage: "@username check your dm!",
        keywords: {
          create: [
            { keyword: "TRAIN", normalizedKeyword: "train" },
            { keyword: "TRAIN LINK", normalizedKeyword: "train link" },
            { keyword: "LINK", normalizedKeyword: "link" },
          ],
        },
      },
    });
  }

  console.log(`Seeded development user ${DEV_EMAIL}`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
