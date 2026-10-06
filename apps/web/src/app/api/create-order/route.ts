import { requireUser } from "@/lib/auth/session";
import { assertSameOrigin } from "@/lib/csrf";
import { getEnv } from "@/lib/env";
import { jsonError, jsonOk, readJson } from "@/lib/http";
import {
  createRazorpayOrder,
  parseOrderAmount,
  razorpayConfigured,
} from "@/lib/razorpay";
import { createPendingPayment } from "@/lib/payments";

type Body = {
  amount?: unknown;
  currency?: unknown;
  receipt?: unknown;
};

export async function POST(request: Request) {
  const originError = assertSameOrigin(request);
  if (originError) {
    return originError;
  }
  const user = await requireUser();
  if (!user) {
    return jsonError("UNAUTHORIZED", "You need to sign in to continue.", 401);
  }
  if (!razorpayConfigured()) {
    return jsonError("INTERNAL_ERROR", "Razorpay is not configured.", 500);
  }

  const body = await readJson<Body>(request).catch(() => ({}) as Body);
  const amount = parseOrderAmount(body.amount);
  if (amount == null) {
    return jsonError(
      "VALIDATION_ERROR",
      "Amount must match a listed plan.",
      400,
    );
  }
  const currency = "INR";
  const receipt =
    typeof body.receipt === "string" && body.receipt.length > 0
      ? body.receipt.slice(0, 40)
      : `rcpt_${user.id.slice(-8)}_${Date.now()}`.slice(0, 40);

  try {
    const order = await createRazorpayOrder({ amount, currency, receipt });
    await createPendingPayment({
      userId: user.id,
      orderId: order.orderId,
      amount: order.amount,
      currency: order.currency,
      receipt,
    });
    return jsonOk({
      order_id: order.orderId,
      amount: order.amount,
      currency: order.currency,
      key_id: getEnv().RAZORPAY_KEY_ID,
    });
  } catch (error) {
    const status = razorpayHttpStatus(error);
    if (status === 401) {
      return jsonError("UNAUTHORIZED", "Razorpay authentication failed.", 401);
    }
    return jsonError(
      "INTERNAL_ERROR",
      "Could not create a Razorpay order.",
      500,
    );
  }
}

function razorpayHttpStatus(error: unknown): number {
  if (
    error &&
    typeof error === "object" &&
    "statusCode" in error &&
    typeof error.statusCode === "number"
  ) {
    return error.statusCode;
  }
  return 500;
}
