import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  parseOrderAmount,
  RAZORPAY_MIN_AMOUNT_PAISE,
  verifyPaymentSignature,
  verifyWebhookSignature,
} from "./razorpay";

describe("parseOrderAmount", () => {
  it("rejects amounts that are not a listed plan", () => {
    expect(parseOrderAmount(99)).toBeNull();
    expect(parseOrderAmount(RAZORPAY_MIN_AMOUNT_PAISE)).toBeNull();
    expect(parseOrderAmount(1.5)).toBeNull();
    expect(parseOrderAmount("nope")).toBeNull();
    expect(parseOrderAmount(79_900)).toBeNull();
    expect(parseOrderAmount(199_900)).toBeNull();
    expect(parseOrderAmount(50_000)).toBeNull();
  });

  it("accepts only official Creator/Pro/Agency monthly and yearly paise", () => {
    expect(parseOrderAmount(29_900)).toBe(29_900);
    expect(parseOrderAmount(299_900)).toBe(299_900);
    expect(parseOrderAmount(59_900)).toBe(59_900);
    expect(parseOrderAmount(599_900)).toBe(599_900);
    expect(parseOrderAmount(99_900)).toBe(99_900);
    expect(parseOrderAmount(999_900)).toBe(999_900);
  });
});

describe("verifyPaymentSignature", () => {
  const secret = "test_secret";
  const orderId = "order_1";
  const paymentId = "pay_1";
  const signature = createHmac("sha256", secret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  it("accepts the HMAC of order_id|payment_id", () => {
    expect(
      verifyPaymentSignature({ orderId, paymentId, signature, secret }),
    ).toBe(true);
  });

  it("rejects a mismatched signature", () => {
    expect(
      verifyPaymentSignature({
        orderId,
        paymentId,
        signature: "a".repeat(signature.length),
        secret,
      }),
    ).toBe(false);
  });
});

describe("verifyWebhookSignature", () => {
  it("accepts HMAC of the raw webhook body", () => {
    const secret = "whsec";
    const rawBody = '{"event":"payment.captured"}';
    const signature = createHmac("sha256", secret)
      .update(rawBody)
      .digest("hex");
    expect(verifyWebhookSignature({ rawBody, signature, secret })).toBe(true);
  });

  it("rejects a bad webhook signature", () => {
    expect(
      verifyWebhookSignature({
        rawBody: "{}",
        signature: "deadbeef",
        secret: "whsec",
      }),
    ).toBe(false);
  });
});
