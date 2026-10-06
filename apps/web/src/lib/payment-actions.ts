export const CANCEL_REASON = "Cancelled by user";

export function isCancelledPayment(input: {
  status: string;
  failureReason: string | null;
}) {
  return input.status === "failed" && input.failureReason === CANCEL_REASON;
}

export function canCancelPayment(status: string) {
  return status === "pending";
}

export function canRetryCheckout(input: {
  status: string;
  failureReason: string | null;
}) {
  if (input.status === "pending") return true;
  return input.status === "failed" && !isCancelledPayment(input);
}

export function canResendEmail(input: {
  status: string;
  emailStatus: string;
  failureReason: string | null;
}) {
  if (isCancelledPayment(input)) return false;
  if (input.status !== "paid" && input.status !== "failed") return false;
  return input.emailStatus !== "sent";
}

export function paymentBadgeLabel(
  status: string,
  failureReason: string | null,
) {
  return isCancelledPayment({ status, failureReason }) ? "cancelled" : status;
}
