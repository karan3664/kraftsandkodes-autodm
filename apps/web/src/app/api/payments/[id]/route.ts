import { requireUser } from "@/lib/auth/session";
import { assertSameOrigin } from "@/lib/csrf";
import { getEnv } from "@/lib/env";
import { jsonError, jsonOk, readJson } from "@/lib/http";
import { canRetryCheckout } from "@/lib/payment-actions";
import {
  cancelPendingPayment,
  createPendingPayment,
  loadOwnedById,
  resendPaymentReceipt,
} from "@/lib/payments";
import {
  createRazorpayOrder,
  parseOrderAmount,
  razorpayConfigured,
} from "@/lib/razorpay";

type RouteContext = { params: Promise<{ id: string }> };
type Body = { action?: unknown };

export async function POST(request: Request, context: RouteContext) {
  const originError = assertSameOrigin(request);
  if (originError) {
    return originError;
  }
  const user = await requireUser();
  if (!user) {
    return jsonError("UNAUTHORIZED", "You need to sign in to continue.", 401);
  }

  const { id } = await context.params;
  const body = await readJson<Body>(request).catch(() => ({}) as Body);
  const action = typeof body.action === "string" ? body.action : "";

  try {
    if (action === "cancel") {
      const payment = await cancelPendingPayment(user.id, id);
      return jsonOk({
        status: payment.status,
        emailStatus: payment.emailStatus,
      });
    }

    if (action === "retry") {
      const payment = await loadOwnedById(user.id, id);
      if (
        canRetryCheckout({
          status: payment.status,
          failureReason: payment.failureReason,
        })
      ) {
        if (!razorpayConfigured()) {
          return jsonError(
            "INTERNAL_ERROR",
            "Razorpay is not configured.",
            500,
          );
        }
        if (payment.status === "pending") {
          return jsonOk({
            kind: "checkout" as const,
            order_id: payment.razorpayOrderId,
            amount: payment.amount,
            currency: payment.currency,
            key_id: getEnv().RAZORPAY_KEY_ID,
          });
        }
        const amount = parseOrderAmount(payment.amount);
        if (amount == null) {
          return jsonError(
            "VALIDATION_ERROR",
            "That plan is no longer listed. Cancel is not available on a failed receipt — pick a current plan.",
            400,
          );
        }
        const receipt = `rcpt_${user.id.slice(-8)}_${Date.now()}`.slice(0, 40);
        const order = await createRazorpayOrder({
          amount,
          currency: "INR",
          receipt,
        });
        await createPendingPayment({
          userId: user.id,
          orderId: order.orderId,
          amount: order.amount,
          currency: order.currency,
          receipt,
        });
        return jsonOk({
          kind: "checkout" as const,
          order_id: order.orderId,
          amount: order.amount,
          currency: order.currency,
          key_id: getEnv().RAZORPAY_KEY_ID,
        });
      }
      const mailed = await resendPaymentReceipt(user, id);
      return jsonOk({
        kind: "email" as const,
        emailStatus: mailed.emailStatus,
      });
    }
  } catch (caught) {
    if (caught instanceof Error && caught.message === "ORDER_NOT_OWNED") {
      return jsonError("FORBIDDEN", "That order does not belong to you.", 403);
    }
    if (caught instanceof Error && caught.message === "NOT_CANCELLABLE") {
      return jsonError(
        "VALIDATION_ERROR",
        "Only a pending receipt can be cancelled.",
        400,
      );
    }
    if (caught instanceof Error && caught.message === "EMAIL_NOT_RETRYABLE") {
      return jsonError(
        "VALIDATION_ERROR",
        "This receipt cannot be emailed again.",
        400,
      );
    }
    return jsonError("INTERNAL_ERROR", "Could not update that receipt.", 500);
  }

  return jsonError("VALIDATION_ERROR", "Unknown receipt action.", 400);
}
