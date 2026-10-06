import { describe, expect, it } from "vitest";
import {
  CANCEL_REASON,
  canCancelPayment,
  canResendEmail,
  canRetryCheckout,
  paymentBadgeLabel,
} from "./payment-actions";

describe("payment actions", () => {
  it("lets pending receipts retry checkout or cancel", () => {
    expect(canCancelPayment("pending")).toBe(true);
    expect(canRetryCheckout({ status: "pending", failureReason: null })).toBe(
      true,
    );
    expect(
      canResendEmail({
        status: "pending",
        emailStatus: "pending",
        failureReason: null,
      }),
    ).toBe(false);
  });

  it("lets failed payments retry, but not cancelled ones", () => {
    expect(
      canRetryCheckout({ status: "failed", failureReason: "card declined" }),
    ).toBe(true);
    expect(
      canRetryCheckout({ status: "failed", failureReason: CANCEL_REASON }),
    ).toBe(false);
    expect(canCancelPayment("failed")).toBe(false);
    expect(paymentBadgeLabel("failed", CANCEL_REASON)).toBe("cancelled");
  });

  it("lets paid receipts resend email when mail did not send", () => {
    expect(
      canResendEmail({
        status: "paid",
        emailStatus: "failed",
        failureReason: null,
      }),
    ).toBe(true);
    expect(
      canResendEmail({
        status: "paid",
        emailStatus: "sent",
        failureReason: null,
      }),
    ).toBe(false);
  });
});
