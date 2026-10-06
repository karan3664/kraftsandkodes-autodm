/**
 * Developer tool: attach a real Instagram User access token (from the Meta App
 * Dashboard "Generate token" button) to the seeded dev user without running
 * the OAuth redirect. Reads INSTAGRAM_ACCESS_TOKEN from the environment.
 *
 * Verifies the token against the live Graph API, subscribes the comments
 * webhook, encrypts the token, and upserts InstagramAccount. Never prints it.
 */
import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";
import { encryptSecret } from "@kdl/shared/crypto";
import { createInstagramClient } from "@kdl/instagram";
import { prisma } from "../src/index";

loadEnv({ path: resolve(process.cwd(), "../../.env") });
loadEnv({ path: resolve(process.cwd(), ".env") });

const DEV_EMAIL = process.env.IMPORT_USER_EMAIL ?? "dev@karandigitallabs.com";

async function main() {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  const key = process.env.TOKEN_ENCRYPTION_KEY;
  if (!token) throw new Error("INSTAGRAM_ACCESS_TOKEN is required.");
  if (!key) throw new Error("TOKEN_ENCRYPTION_KEY is required.");
  if (process.env.INSTAGRAM_MOCK_MODE === "true") {
    throw new Error(
      "Set INSTAGRAM_MOCK_MODE=false before importing a real token.",
    );
  }

  const user = await prisma.user.findUnique({ where: { email: DEV_EMAIL } });
  if (!user)
    throw new Error(`User ${DEV_EMAIL} not found. Run pnpm db:seed first.`);

  const client = createInstagramClient({
    INSTAGRAM_MOCK_MODE: "false",
    NODE_ENV: process.env.NODE_ENV,
    META_APP_ID: process.env.META_APP_ID,
    META_APP_SECRET: process.env.META_APP_SECRET,
    META_REDIRECT_URI: process.env.META_REDIRECT_URI,
    META_API_VERSION: process.env.META_API_VERSION,
    META_GRAPH_BASE_URL: process.env.META_GRAPH_BASE_URL,
  });

  const profile = await client.getProfile(token);
  const subscription = await client.subscribeWebhooks({
    accessToken: token,
    fields: ["comments", "messages"],
  });

  const account = await prisma.instagramAccount.upsert({
    where: { instagramUserId: profile.id },
    update: {
      userId: user.id,
      username: profile.username,
      profilePictureUrl: profile.profilePictureUrl,
      accessTokenEncrypted: encryptSecret(token, key),
      tokenExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      webhookStatus: subscription.success ? "active" : "error",
      webhookError: subscription.success ? null : subscription.errorMessage,
    },
    create: {
      userId: user.id,
      instagramUserId: profile.id,
      username: profile.username,
      profilePictureUrl: profile.profilePictureUrl,
      accessTokenEncrypted: encryptSecret(token, key),
      tokenExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      webhookStatus: subscription.success ? "active" : "error",
      webhookError: subscription.success ? null : subscription.errorMessage,
    },
  });

  console.log(
    JSON.stringify(
      {
        imported: true,
        accountId: account.id,
        instagramUserId: profile.id,
        username: profile.username,
        accountType: profile.accountType ?? null,
        webhookStatus: account.webhookStatus,
        webhookError: account.webhookError,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
