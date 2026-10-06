import { createHmac, timingSafeEqual } from "node:crypto";
import { safeEqual } from "@kdl/shared/crypto";
import { NextRequest, NextResponse } from "next/server";
import { getEnv, isMockMode } from "@/lib/env";
import { logger } from "@/lib/logger";
import {
  processIncomingComment,
  processIncomingMessage,
} from "@/lib/automation/engine";
import {
  extractComments,
  extractMessages,
} from "@/lib/automation/webhook-payload";

export async function GET(request: NextRequest) {
  const env = getEnv();
  const mode = request.nextUrl.searchParams.get("hub.mode");
  const token = request.nextUrl.searchParams.get("hub.verify_token");
  const challenge = request.nextUrl.searchParams.get("hub.challenge");

  if (
    mode === "subscribe" &&
    token &&
    challenge &&
    safeEqual(token, env.META_WEBHOOK_VERIFY_TOKEN)
  ) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json(
    {
      success: false,
      error: { code: "FORBIDDEN", message: "Webhook verification failed." },
    },
    { status: 403 },
  );
}

export async function POST(request: NextRequest) {
  const rawBytes = Buffer.from(await request.arrayBuffer());
  const rawBody = rawBytes.toString("utf8");
  const env = getEnv();

  if (!isMockMode()) {
    const signature =
      request.headers.get("x-hub-signature-256") ??
      request.headers.get("X-Hub-Signature-256");
    if (
      !env.META_APP_SECRET ||
      !signature ||
      !verifySignature(rawBytes, signature, env.META_APP_SECRET)
    ) {
      const expected = `sha256=${createHmac(
        "sha256",
        env.META_APP_SECRET.trim(),
      )
        .update(rawBytes)
        .digest("hex")}`;
      logger.warn("webhook_invalid_signature", {
        hasSecret: Boolean(env.META_APP_SECRET),
        hasHeader: Boolean(signature),
        bodyBytes: rawBytes.byteLength,
        appIdPrefix: env.META_APP_ID.slice(0, 6),
        gotPrefix: (signature ?? "").slice(0, 18),
        wantPrefix: expected.slice(0, 18),
      });
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "WEBHOOK_INVALID_SIGNATURE",
            message: "Invalid webhook signature.",
          },
        },
        { status: 401 },
      );
    }
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody) as unknown;
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Invalid JSON." },
      },
      { status: 400 },
    );
  }

  const comments = extractComments(payload);
  const messages = extractMessages(payload);
  const received = comments.length + messages.length;
  try {
    for (const comment of comments) {
      await processIncomingComment(comment);
    }
    for (const message of messages) {
      await processIncomingMessage(message);
    }
    return NextResponse.json(
      { success: true, data: { received } },
      { status: 200 },
    );
  } catch {
    logger.error("webhook_processing_failed", { received });
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Webhook processing failed.",
        },
      },
      { status: 500 },
    );
  }
}

function verifySignature(
  rawBody: Buffer,
  header: string,
  appSecret: string,
): boolean {
  const expected = `sha256=${createHmac("sha256", appSecret.trim())
    .update(rawBody)
    .digest("hex")}`;
  const left = Buffer.from(header.trim());
  const right = Buffer.from(expected);
  if (left.length !== right.length) {
    return false;
  }
  return timingSafeEqual(left, right);
}
