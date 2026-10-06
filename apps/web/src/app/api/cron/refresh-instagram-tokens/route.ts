import { getEnv } from "@/lib/env";
import { jsonError, jsonOk } from "@/lib/http";
import { refreshDueInstagramTokens } from "@/lib/instagram-token-refresh";
import { logger } from "@/lib/logger";

function authorized(request: Request): boolean {
  const secret = getEnv().CRON_SECRET;
  if (!secret) {
    return false;
  }
  const header = request.headers.get("authorization") ?? "";
  if (header === `Bearer ${secret}`) {
    return true;
  }
  const url = new URL(request.url);
  return url.searchParams.get("secret") === secret;
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return jsonError("UNAUTHORIZED", "Invalid cron secret.", 401);
  }
  try {
    const summary = await refreshDueInstagramTokens();
    logger.info("instagram_token_refresh_cron", {
      considered: summary.considered,
      refreshed: summary.results.filter((r) => r.status === "refreshed").length,
      failed: summary.results.filter((r) => r.status === "failed").length,
    });
    return jsonOk({
      considered: summary.considered,
      refreshed: summary.results.filter((r) => r.status === "refreshed").length,
      failed: summary.results.filter((r) => r.status === "failed").length,
      locked: summary.results.filter((r) => r.status === "locked").length,
      skipped: summary.results.filter((r) => r.status === "skipped").length,
    });
  } catch {
    logger.error("instagram_token_refresh_cron_failed");
    return jsonError("INTERNAL_ERROR", "Token refresh cron failed.", 500);
  }
}

export async function GET(request: Request) {
  return POST(request);
}
