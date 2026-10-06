import { createHmac, timingSafeEqual } from "node:crypto";
import Razorpay from "razorpay";
import { getEnv } from "./env";
import { PAID_CATALOG } from "./plans";

export const RAZORPAY_MIN_AMOUNT_PAISE = 100;
export const PAID_PLAN_AMOUNTS_PAISE = [
  ...new Set(PAID_CATALOG.map((row) => row.amountPaise)),
];

export function razorpayConfigured(): boolean {
  const env = getEnv();
  return Boolean(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET);
}

export function parseOrderAmount(amount: unknown): number | null {
  const value = typeof amount === "number" ? amount : Number(amount);
  if (
    !Number.isInteger(value) ||
    !(PAID_PLAN_AMOUNTS_PAISE as readonly number[]).includes(value)
  ) {
    return null;
  }
  return value;
}

export function verifyPaymentSignature(input: {
  orderId: string;
  paymentId: string;
  signature: string;
  secret: string;
}): boolean {
  const expected = createHmac("sha256", input.secret)
    .update(`${input.orderId}|${input.paymentId}`)
    .digest("hex");
  const left = Buffer.from(expected);
  const right = Buffer.from(input.signature);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function verifyWebhookSignature(input: {
  rawBody: string;
  signature: string;
  secret: string;
}): boolean {
  const expected = createHmac("sha256", input.secret)
    .update(input.rawBody)
    .digest("hex");
  const left = Buffer.from(expected);
  const right = Buffer.from(input.signature);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function createRazorpayOrder(input: {
  amount: number;
  currency: string;
  receipt: string;
}): Promise<{ orderId: string; amount: number; currency: string }> {
  const env = getEnv();
  const client = new Razorpay({
    key_id: env.RAZORPAY_KEY_ID,
    key_secret: env.RAZORPAY_KEY_SECRET,
  });
  const order = await client.orders.create({
    amount: input.amount,
    currency: input.currency,
    receipt: input.receipt,
  });
  return {
    orderId: order.id,
    amount: Number(order.amount),
    currency: order.currency,
  };
}
