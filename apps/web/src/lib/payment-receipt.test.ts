import { describe, expect, it } from "vitest";
import {
  buildPaymentReceipt,
  formatInr,
  planLabelFromAmount,
} from "./payment-receipt";

describe("payment receipt", () => {
  it("maps known plan amounts and formats INR", () => {
    expect(planLabelFromAmount(59_900)).toBe("Pro");
    expect(planLabelFromAmount(99_900)).toBe("Agency");
    expect(planLabelFromAmount(79_900)).toBe("Custom");
    expect(formatInr(59_900)).toContain("599");
  });

  it("builds a success receipt with order and payment ids", () => {
    const mail = buildPaymentReceipt({
      name: "Karan",
      status: "paid",
      amountPaise: 59_900,
      currency: "INR",
      planLabel: "Pro",
      orderId: "order_1",
      paymentId: "pay_1",
      receipt: "rcpt_1",
      at: new Date("2026-10-04T12:00:00.000Z"),
    });
    expect(mail.subject).toContain("Successful");
    expect(mail.text).toContain("order_1");
    expect(mail.text).toContain("pay_1");
    expect(mail.html).toContain("Payment successful");
    expect(mail.html).toContain("/brand/logo.jpg");
    expect(mail.html).toContain("#ede8dc");
  });

  it("builds a failure receipt with the reason", () => {
    const mail = buildPaymentReceipt({
      name: "Karan",
      status: "failed",
      amountPaise: 59_900,
      currency: "INR",
      planLabel: "Pro",
      orderId: "order_1",
      receipt: "rcpt_1",
      reason: "Payment signature did not match.",
      at: new Date("2026-10-04T12:00:00.000Z"),
    });
    expect(mail.subject).toContain("Failed");
    expect(mail.text).toContain("Payment signature did not match.");
  });
});
