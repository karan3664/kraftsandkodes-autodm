"use client";

import { useState } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type RazorpaySuccess = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

type RazorpayCheckout = {
  open: () => void;
  on: (event: "payment.failed", handler: (response: unknown) => void) => void;
};

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayCheckout;
  }
}

type ApiBody<T> = {
  success: boolean;
  data?: T;
  error?: { message: string };
};

export type CheckoutOrder = {
  order_id: string;
  amount: number;
  currency: string;
  key_id: string;
};

export function openRazorpayCheckout(input: {
  order: CheckoutOrder;
  label: string;
  name?: string;
  email?: string;
  onSettled: () => void;
  /** Called after verify-payment finishes (paid or failed), before onSettled. */
  onVerified?: () => void;
}) {
  if (!window.Razorpay) {
    toast.error("Razorpay checkout is still loading. Try again.");
    input.onSettled();
    return;
  }
  const { order } = input;
  const checkout = new window.Razorpay({
    key: order.key_id || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "",
    amount: order.amount,
    currency: order.currency,
    name: "KARAN DIGITAL LABS",
    description: `KRAFTSANDKODES — ${input.label}`,
    order_id: order.order_id,
    prefill: { name: input.name, email: input.email },
    handler: (response: RazorpaySuccess) => {
      void verifyCheckout(response)
        .then(() => input.onVerified?.())
        .finally(input.onSettled);
    },
    modal: {
      ondismiss: () => {
        input.onSettled();
        toast.message("Checkout cancelled.");
      },
    },
  });
  checkout.on("payment.failed", (failed) => {
    const err = failed as {
      error?: {
        description?: string;
        metadata?: { payment_id?: string };
      };
    };
    void fetch("/api/verify-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        razorpay_order_id: order.order_id,
        razorpay_payment_id: err.error?.metadata?.payment_id,
        error: err.error?.description ?? "Payment failed at checkout.",
      }),
    })
      .catch(() => undefined)
      .finally(() => {
        input.onVerified?.();
        input.onSettled();
        toast.error("Payment failed. A receipt was emailed if mail is set up.");
      });
  });
  checkout.open();
}

async function verifyCheckout(response: RazorpaySuccess) {
  try {
    const verifyResponse = await fetch("/api/verify-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(response),
    });
    const body = (await verifyResponse.json()) as ApiBody<{
      paid: boolean;
      emailStatus?: string;
    }>;
    if (!body.success || !body.data?.paid) {
      toast.error(
        body.error?.message ??
          "Payment could not be verified. Check email for the receipt.",
      );
      return;
    }
    toast.success(
      body.data.emailStatus === "sent"
        ? "Payment verified. Receipt emailed."
        : "Payment verified. Receipt could not be emailed — check SMTP settings.",
    );
  } catch {
    toast.error("Payment could not be verified.");
  }
}

export function PayButton({
  amountPaise,
  label,
  name,
  email,
  disabled,
}: {
  amountPaise: number;
  label: string;
  name?: string;
  email?: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function pay() {
    setBusy(true);
    try {
      const orderResponse = await fetch("/api/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: amountPaise,
          currency: "INR",
        }),
      });
      const orderBody = (await orderResponse.json()) as ApiBody<CheckoutOrder>;
      if (!orderBody.success || !orderBody.data) {
        toast.error(orderBody.error?.message ?? "Could not start checkout.");
        setBusy(false);
        return;
      }
      openRazorpayCheckout({
        order: orderBody.data,
        label,
        name,
        email,
        onVerified: () => router.refresh(),
        onSettled: () => setBusy(false),
      });
    } catch {
      toast.error("Could not start checkout.");
      setBusy(false);
    }
  }

  return (
    <>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="afterInteractive"
      />
      <Button onClick={pay} disabled={disabled || busy}>
        {busy ? "Opening checkout…" : label}
      </Button>
    </>
  );
}
