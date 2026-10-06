import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const markPaymentPaidByOrder = vi.fn();
const markPaymentFailedByOrder = vi.fn();
const markPaymentRefundedByOrder = vi.fn();

vi.mock("@/lib/env", () => ({
  getEnv: () => ({
    RAZORPAY_KEY_ID: "rzp_test",
    RAZORPAY_KEY_SECRET: "secret",
    RAZORPAY_WEBHOOK_SECRET: "whsec",
  }),
}));

vi.mock("@/lib/razorpay", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/razorpay")>("@/lib/razorpay");
  return {
    ...actual,
    razorpayConfigured: () => true,
  };
});

vi.mock("@/lib/payments", () => ({
  markPaymentPaidByOrder: (...args: unknown[]) =>
    markPaymentPaidByOrder(...args),
  markPaymentFailedByOrder: (...args: unknown[]) =>
    markPaymentFailedByOrder(...args),
  markPaymentRefundedByOrder: (...args: unknown[]) =>
    markPaymentRefundedByOrder(...args),
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

function signedRequest(body: object) {
  const rawBody = JSON.stringify(body);
  const signature = createHmac("sha256", "whsec").update(rawBody).digest("hex");
  return new Request("http://localhost/api/webhooks/razorpay", {
    method: "POST",
    headers: { "x-razorpay-signature": signature },
    body: rawBody,
  });
}

describe("razorpay webhook", () => {
  beforeEach(() => {
    markPaymentPaidByOrder.mockReset();
    markPaymentFailedByOrder.mockReset();
    markPaymentRefundedByOrder.mockReset();
    markPaymentPaidByOrder.mockResolvedValue({ status: "paid" });
    markPaymentFailedByOrder.mockResolvedValue({ status: "failed" });
    markPaymentRefundedByOrder.mockResolvedValue({ status: "refunded" });
  });

  it("rejects invalid signatures", async () => {
    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/webhooks/razorpay", {
        method: "POST",
        headers: { "x-razorpay-signature": "bad" },
        body: "{}",
      }),
    );
    expect(response.status).toBe(400);
    expect(markPaymentPaidByOrder).not.toHaveBeenCalled();
  });

  it("marks captured payments paid", async () => {
    const { POST } = await import("./route");
    const response = await POST(
      signedRequest({
        event: "payment.captured",
        payload: {
          payment: { entity: { id: "pay_1", order_id: "order_1" } },
        },
      }),
    );
    expect(response.status).toBe(200);
    expect(markPaymentPaidByOrder).toHaveBeenCalledWith({
      orderId: "order_1",
      paymentId: "pay_1",
    });
  });

  it("marks failed payments", async () => {
    const { POST } = await import("./route");
    const response = await POST(
      signedRequest({
        event: "payment.failed",
        payload: {
          payment: {
            entity: {
              id: "pay_2",
              order_id: "order_2",
              error_description: "declined",
            },
          },
        },
      }),
    );
    expect(response.status).toBe(200);
    expect(markPaymentFailedByOrder).toHaveBeenCalledWith({
      orderId: "order_2",
      paymentId: "pay_2",
      reason: "declined",
    });
  });

  it("handles refunds without granting access", async () => {
    const { POST } = await import("./route");
    const response = await POST(
      signedRequest({
        event: "payment.refunded",
        payload: {
          payment: { entity: { id: "pay_3", order_id: "order_3" } },
        },
      }),
    );
    expect(response.status).toBe(200);
    expect(markPaymentRefundedByOrder).toHaveBeenCalledWith({
      orderId: "order_3",
      paymentId: "pay_3",
      reason: "Refunded by Razorpay",
    });
    expect(markPaymentPaidByOrder).not.toHaveBeenCalled();
  });

  it("is idempotent for unknown orders", async () => {
    markPaymentPaidByOrder.mockRejectedValue(new Error("ORDER_NOT_FOUND"));
    const { POST } = await import("./route");
    const response = await POST(
      signedRequest({
        event: "payment.captured",
        payload: {
          payment: { entity: { id: "pay_x", order_id: "missing" } },
        },
      }),
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as { data?: { ignored?: boolean } };
    expect(body.data?.ignored).toBe(true);
  });
});
