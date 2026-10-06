import { requireUser } from "@/lib/auth/session";
import { assertSameOrigin } from "@/lib/csrf";
import { getEnv } from "@/lib/env";
import { jsonError, jsonOk, readJson } from "@/lib/http";
import { markPaymentFailed, markPaymentPaid } from "@/lib/payments";
import { razorpayConfigured, verifyPaymentSignature } from "@/lib/razorpay";

type Body = {
  razorpay_order_id?: unknown;
  razorpay_payment_id?: unknown;
  razorpay_signature?: unknown;
  error?: unknown;
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
  const orderId =
    typeof body.razorpay_order_id === "string" ? body.razorpay_order_id : "";
  const paymentId =
    typeof body.razorpay_payment_id === "string"
      ? body.razorpay_payment_id
      : "";
  const signature =
    typeof body.razorpay_signature === "string" ? body.razorpay_signature : "";
  const error =
    typeof body.error === "string" && body.error.trim()
      ? body.error.trim()
      : "";

  if (!orderId) {
    return jsonError(
      "VALIDATION_ERROR",
      "Payment verification fields are missing.",
      400,
    );
  }

  try {
    if (signature && !paymentId) {
      return jsonError(
        "VALIDATION_ERROR",
        "Payment verification fields are missing.",
        400,
      );
    }

    if (error || !signature) {
      const reason = error || "Payment failed at checkout.";
      const payment = await markPaymentFailed({
        user,
        orderId,
        paymentId: paymentId || undefined,
        reason,
      });
      return jsonOk({
        paid: false,
        status: payment.status,
        emailStatus: payment.emailStatus,
      });
    }

    const matched = verifyPaymentSignature({
      orderId,
      paymentId,
      signature,
      secret: getEnv().RAZORPAY_KEY_SECRET,
    });
    if (!matched) {
      await markPaymentFailed({
        user,
        orderId,
        paymentId,
        reason: "Payment signature did not match.",
      });
      return jsonError(
        "VALIDATION_ERROR",
        "Payment signature did not match.",
        400,
      );
    }

    const payment = await markPaymentPaid({
      user,
      orderId,
      paymentId,
    });
    return jsonOk({
      paid: true,
      status: payment.status,
      emailStatus: payment.emailStatus,
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
    });
  } catch (caught) {
    if (caught instanceof Error && caught.message === "ORDER_NOT_OWNED") {
      return jsonError("FORBIDDEN", "That order does not belong to you.", 403);
    }
    return jsonError("INTERNAL_ERROR", "Could not record this payment.", 500);
  }
}
