import { pingDatabase } from "@kdl/db";
import { pingRedis } from "@/lib/redis";
import { getEnv } from "@/lib/env";
import { getInstagramStatus } from "@/lib/instagram";
import { jsonOk } from "@/lib/http";

export async function GET() {
  const env = getEnv();
  const [database, redis] = await Promise.all([pingDatabase(), pingRedis()]);
  if (env.NODE_ENV === "production") {
    const ok = database && redis;
    return jsonOk({ ok });
  }
  const instagram = getInstagramStatus();
  return jsonOk({
    database: database ? "connected" : "disconnected",
    redis: redis ? "connected" : "disconnected",
    instagram: instagram.configured
      ? instagram.mock
        ? "mock"
        : "configured"
      : "not_configured",
    webhook: "/api/webhooks/instagram",
    environment: env.NODE_ENV,
  });
}
