import { prisma } from "@kdl/db";
import { sendMail } from "./mail";
import {
  CANCEL_REASON,
  canCancelPayment,
  canResendEmail,
} from "./payment-actions";
import { buildPaymentReceipt, planLabelFromAmount } from "./payment-receipt";
import { paidCatalogRow } from "./plans";

type UserMail = { id: string; email: string; name: string };

export async function createPendingPayment(input: {
  userId: string;
  orderId: string;
  amount: number;
  currency: string;
  receipt: string;
}) {
  return prisma.payment.create({
    data: {
      userId: input.userId,
      razorpayOrderId: input.orderId,
      amount: input.amount,
      currency: input.currency,
      receipt: input.receipt,
      planLabel: planLabelFromAmount(input.amount),
      status: "pending",
    },
  });
}

export async function markPaymentPaid(input: {
  user: UserMail;
  orderId: string;
  paymentId: string;
}) {
  const payment = await loadOwned(input.user.id, input.orderId);
  if (payment.status === "paid") {
    await activatePlan(input.user.id, payment.planLabel, payment.amount);
    return payment;
  }
  const updated = await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: "paid",
      razorpayPaymentId: input.paymentId,
      failureReason: null,
    },
  });
  await activatePlan(input.user.id, updated.planLabel, updated.amount);
  return sendReceipt(input.user, updated, "paid");
}

export async function markPaymentFailed(input: {
  user: UserMail;
  orderId: string;
  paymentId?: string;
  reason: string;
}) {
  const payment = await loadOwned(input.user.id, input.orderId);
  if (payment.status === "paid") {
    return payment;
  }
  const alreadyMailed =
    payment.status === "failed" && payment.emailStatus === "sent";
  const updated = await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: "failed",
      razorpayPaymentId: input.paymentId ?? payment.razorpayPaymentId,
      failureReason: input.reason,
    },
  });
  if (alreadyMailed) {
    return updated;
  }
  return sendReceipt(input.user, updated, "failed");
}

export async function markPaymentPaidByOrder(input: {
  orderId: string;
  paymentId: string;
}) {
  const payment = await prisma.payment.findUnique({
    where: { razorpayOrderId: input.orderId },
    include: { user: true },
  });
  if (!payment) {
    throw new Error("ORDER_NOT_FOUND");
  }
  return markPaymentPaid({
    user: {
      id: payment.user.id,
      email: payment.user.email,
      name: payment.user.name,
    },
    orderId: input.orderId,
    paymentId: input.paymentId,
  });
}

export async function markPaymentFailedByOrder(input: {
  orderId: string;
  paymentId?: string;
  reason: string;
}) {
  const payment = await prisma.payment.findUnique({
    where: { razorpayOrderId: input.orderId },
    include: { user: true },
  });
  if (!payment) {
    throw new Error("ORDER_NOT_FOUND");
  }
  return markPaymentFailed({
    user: {
      id: payment.user.id,
      email: payment.user.email,
      name: payment.user.name,
    },
    orderId: input.orderId,
    paymentId: input.paymentId,
    reason: input.reason,
  });
}

export async function markPaymentRefundedByOrder(input: {
  orderId: string;
  paymentId?: string;
  reason?: string;
}) {
  const payment = await prisma.payment.findUnique({
    where: { razorpayOrderId: input.orderId },
  });
  if (!payment) {
    throw new Error("ORDER_NOT_FOUND");
  }
  if (payment.status === "refunded") {
    return payment;
  }
  const updated = await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: "refunded",
      razorpayPaymentId: input.paymentId ?? payment.razorpayPaymentId,
      failureReason: input.reason ?? "Refunded by Razorpay",
    },
  });
  // Refund ends paid access. Automations and IG accounts stay; limits become free.
  await prisma.user.update({
    where: { id: payment.userId },
    data: { plan: "free", planExpiresAt: new Date() },
  });
  return updated;
}

async function activatePlan(
  userId: string,
  _planLabel: string,
  amountPaise: number,
) {
  const row = paidCatalogRow(amountPaise);
  if (!row) {
    throw new Error("UNKNOWN_PLAN");
  }
  const planExpiresAt = new Date(Date.now() + row.days * 24 * 60 * 60 * 1000);
  await prisma.user.update({
    where: { id: userId },
    data: { plan: row.slug, planExpiresAt },
  });
}

export async function cancelPendingPayment(userId: string, paymentId: string) {
  const payment = await loadOwnedById(userId, paymentId);
  if (!canCancelPayment(payment.status)) {
    throw new Error("NOT_CANCELLABLE");
  }
  return prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: "failed",
      failureReason: CANCEL_REASON,
      emailStatus: "skipped",
      emailError: null,
    },
  });
}

export async function resendPaymentReceipt(user: UserMail, paymentId: string) {
  const payment = await loadOwnedById(user.id, paymentId);
  if (
    !canResendEmail({
      status: payment.status,
      emailStatus: payment.emailStatus,
      failureReason: payment.failureReason,
    })
  ) {
    throw new Error("EMAIL_NOT_RETRYABLE");
  }
  if (payment.status !== "paid" && payment.status !== "failed") {
    throw new Error("EMAIL_NOT_RETRYABLE");
  }
  return sendReceipt(user, payment, payment.status);
}

export async function loadOwnedById(userId: string, paymentId: string) {
  const existing = await prisma.payment.findUnique({
    where: { id: paymentId },
  });
  if (!existing || existing.userId !== userId) {
    throw new Error("ORDER_NOT_OWNED");
  }
  return existing;
}

async function loadOwned(userId: string, orderId: string) {
  const existing = await prisma.payment.findUnique({
    where: { razorpayOrderId: orderId },
  });
  if (!existing || existing.userId !== userId) {
    throw new Error("ORDER_NOT_OWNED");
  }
  return existing;
}

async function sendReceipt(
  user: UserMail,
  payment: {
    id: string;
    status: "pending" | "paid" | "failed" | "refunded";
    amount: number;
    currency: string;
    planLabel: string;
    razorpayOrderId: string;
    razorpayPaymentId: string | null;
    receipt: string;
    failureReason: string | null;
  },
  status: "paid" | "failed",
) {
  const mail = buildPaymentReceipt({
    name: user.name,
    status,
    amountPaise: payment.amount,
    currency: payment.currency,
    planLabel: payment.planLabel,
    orderId: payment.razorpayOrderId,
    paymentId: payment.razorpayPaymentId,
    receipt: payment.receipt,
    reason: payment.failureReason,
    at: new Date(),
  });
  const result = await sendMail({
    to: user.email,
    subject: mail.subject,
    text: mail.text,
    html: mail.html,
  });
  return prisma.payment.update({
    where: { id: payment.id },
    data: {
      emailStatus: result.sent ? "sent" : "failed",
      emailError: result.sent ? null : (result.error ?? "Mail was not sent."),
    },
  });
}
