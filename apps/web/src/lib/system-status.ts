import { prisma } from "@kdl/db";
import { decryptSecret } from "@kdl/shared/crypto";
import { InstagramApiError } from "@kdl/instagram";
import { getEnv, isMockMode } from "@/lib/env";
import { getInstagramClient, getInstagramStatus } from "@/lib/instagram";

export type SystemCheck = {
  label: string;
  value: string;
  ok: boolean;
};

export async function getMetaReadiness(): Promise<SystemCheck[]> {
  const { pingDatabase } = await import("@kdl/db");
  const { pingRedis } = await import("@/lib/redis");
  const [database, redis] = await Promise.all([pingDatabase(), pingRedis()]);
  const present = (name: string) => Boolean(process.env[name]?.trim());
  const configured = (label: string, ok: boolean): SystemCheck => ({
    label,
    value: ok ? "Configured" : "Missing",
    ok,
  });
  return [
    configured("Meta App ID", present("META_APP_ID")),
    configured("Meta App Secret", present("META_APP_SECRET")),
    configured("OAuth Redirect URI", present("META_REDIRECT_URI")),
    configured("Webhook Verify Token", present("META_WEBHOOK_VERIFY_TOKEN")),
    configured("Token Encryption", present("TOKEN_ENCRYPTION_KEY")),
    configured(
      "Instagram API",
      present("META_APP_ID") &&
        present("META_APP_SECRET") &&
        present("META_REDIRECT_URI"),
    ),
    {
      label: "Database",
      value: database ? "Connected" : "Disconnected",
      ok: database,
    },
    {
      label: "Redis",
      value: redis ? "Connected" : "Disconnected",
      ok: redis,
    },
  ];
}

export async function getSystemChecks(): Promise<SystemCheck[]> {
  const env = getEnv();
  const { pingDatabase } = await import("@kdl/db");
  const { pingRedis } = await import("@/lib/redis");
  const [database, redis] = await Promise.all([pingDatabase(), pingRedis()]);
  const metaMissing = [
    ["META_APP_ID", env.META_APP_ID],
    ["META_APP_SECRET", env.META_APP_SECRET],
    ["META_REDIRECT_URI", env.META_REDIRECT_URI],
    ["META_WEBHOOK_VERIFY_TOKEN", env.META_WEBHOOK_VERIFY_TOKEN],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);

  const instagram = await instagramApiCheck();
  const webhook = await webhookCheck();

  return [
    {
      label: "Database",
      value: database ? "Connected" : "Unavailable",
      ok: database,
    },
    { label: "Redis", value: redis ? "Connected" : "Unavailable", ok: redis },
    {
      label: "Meta app configuration",
      value:
        metaMissing.length === 0
          ? "Configured"
          : `Missing ${metaMissing.join(", ")}`,
      ok: metaMissing.length === 0,
    },
    instagram,
    webhook,
  ];
}

async function instagramApiCheck(): Promise<SystemCheck> {
  if (isMockMode()) {
    return { label: "Instagram API", value: "Mock mode", ok: false };
  }
  const status = getInstagramStatus();
  if (!status.configured) {
    return { label: "Instagram API", value: "Not configured", ok: false };
  }

  try {
    const account = await prisma.instagramAccount.findFirst({
      orderBy: { connectedAt: "desc" },
    });
    if (!account) {
      return {
        label: "Instagram API",
        value: "Credentials present",
        ok: false,
      };
    }
    const accessToken = decryptSecret(
      account.accessTokenEncrypted,
      getEnv().TOKEN_ENCRYPTION_KEY,
    );
    await getInstagramClient().getProfile(accessToken);
    return { label: "Instagram API", value: "Connected", ok: true };
  } catch (error) {
    const expired =
      error instanceof InstagramApiError &&
      (error.code === "INVALID_TOKEN" ||
        error.code === "TOKEN_EXPIRED" ||
        error.status === 401);
    return {
      label: "Instagram API",
      value: expired ? "Token expired" : "Unavailable",
      ok: false,
    };
  }
}

async function webhookCheck(): Promise<SystemCheck> {
  const verifyToken = Boolean(getEnv().META_WEBHOOK_VERIFY_TOKEN);
  if (!verifyToken && !isMockMode()) {
    return {
      label: "Webhook configuration",
      value: "Verify token missing",
      ok: false,
    };
  }
  try {
    const subscribed = await prisma.instagramAccount.findFirst({
      where: { webhookStatus: { in: ["active", "mock"] } },
    });
    if (!subscribed) {
      return {
        label: "Webhook configuration",
        value: "Not subscribed",
        ok: false,
      };
    }
    return {
      label: "Webhook configuration",
      value:
        subscribed.webhookStatus === "mock"
          ? "Mock subscription"
          : "Subscribed",
      ok: subscribed.webhookStatus === "active",
    };
  } catch {
    return { label: "Webhook configuration", value: "Unavailable", ok: false };
  }
}
