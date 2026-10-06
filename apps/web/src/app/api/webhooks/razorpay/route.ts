import { getEnv } from "@/lib/env";
import { jsonError, jsonOk } from "@/lib/http";
import {
  markPaymentFailedByOrder,
  markPaymentPaidByOrder,
  markPaymentRefundedByOrder,
} from "@/lib/payments";
import { razorpayConfigured, verifyWebhookSignature } from "@/lib/razorpay";
import { logger } from "@/lib/logger";

export async function POST(request: Request) {
  if (!razorpayConfigured()) {
    return jsonError("INTERNAL_ERROR", "Razorpay is not configured.", 500);
  }
  const secret = getEnv().RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    return jsonError(
      "INTERNAL_ERROR",
      "Razorpay webhook secret is not configured.",
      500,
    );
  }

  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature") ?? "";
  if (
    !verifyWebhookSignature({
      rawBody,
      signature,
      secret,
    })
  ) {
    logger.warn("razorpay_webhook_invalid_signature");
    return jsonError("FORBIDDEN", "Invalid Razorpay webhook signature.", 400);
  }

  let event: {
    event?: string;
    payload?: {
      payment?: {
        entity?: {
          id?: string;
          order_id?: string;
          error_description?: string;
        };
      };
      refund?: {
        entity?: {
          id?: string;
          payment_id?: string;
          notes?: { order_id?: string };
        };
      };
    };
  };
  try {
    event = JSON.parse(rawBody) as typeof event;
  } catch {
    return jsonError("VALIDATION_ERROR", "Invalid webhook payload.", 400);
  }

  try {
    if (event.event === "payment.captured" || event.event === "order.paid") {
      const payment = event.payload?.payment?.entity;
      const orderId = payment?.order_id;
      const paymentId = payment?.id;
      if (!orderId) {
        return jsonOk({ ignored: true });
      }
      if (!paymentId) {
        return jsonError("VALIDATION_ERROR", "payment id missing.", 400);
      }
      await markPaymentPaidByOrder({ orderId, paymentId });
      return jsonOk({ received: true, status: "paid" });
    }

    if (event.event === "payment.failed") {
      const payment = event.payload?.payment?.entity;
      const orderId = payment?.order_id;
      if (!orderId) {
        return jsonOk({ ignored: true });
      }
      await markPaymentFailedByOrder({
        orderId,
        paymentId: payment?.id,
        reason: payment?.error_description || "Razorpay payment.failed",
      });
      return jsonOk({ received: true, status: "failed" });
    }

    if (
      event.event === "payment.refunded" ||
      event.event === "refund.processed"
    ) {
      const payment = event.payload?.payment?.entity;
      const refund = event.payload?.refund?.entity;
      const orderId =
        payment?.order_id ||
        (typeof refund?.notes?.order_id === "string"
          ? refund.notes.order_id
          : undefined);
      if (!orderId) {
        // Without an order id we cannot safely revoke a plan.
        logger.warn("razorpay_webhook_refund_missing_order");
        return jsonOk({ ignored: true, reason: "missing_order_id" });
      }
      await markPaymentRefundedByOrder({
        orderId,
        paymentId: payment?.id ?? refund?.payment_id,
        reason: "Refunded by Razorpay",
      });
      return jsonOk({ received: true, status: "refunded" });
    }

    return jsonOk({ ignored: true, event: event.event ?? "unknown" });
  } catch (error) {
    if (error instanceof Error && error.message === "ORDER_NOT_FOUND") {
      logger.warn("razorpay_webhook_unknown_order");
      return jsonOk({ ignored: true });
    }
    if (error instanceof Error && error.message === "UNKNOWN_PLAN") {
      logger.error("razorpay_webhook_unknown_plan");
      return jsonError("VALIDATION_ERROR", "Unknown plan amount.", 400);
    }
    logger.error("razorpay_webhook_failed");
    return jsonError("INTERNAL_ERROR", "Webhook processing failed.", 500);
  }
}
