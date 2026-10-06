"use client";

import { Button } from "@/components/ui/button";
import { Modal, ModalContent } from "@/components/ui/modal";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function ConnectInstagramButton({
  disabled,
  canAddAccount = true,
  returnTo,
  resume = false,
  className,
  label,
}: {
  disabled?: boolean;
  canAddAccount?: boolean;
  returnTo?: "/dashboard" | "/dashboard/instagram";
  /** True when an earlier Instagram login did not finish with Allow. */
  resume?: boolean;
  className?: string;
  label?: string;
}) {
  const [ask, setAsk] = useState(false);

  if (!canAddAccount) {
    return (
      <Button asChild className={className}>
        <a href="/dashboard/settings?tab=billing">Upgrade plan</a>
      </Button>
    );
  }

  const href = returnTo
    ? `/api/instagram/connect?next=${encodeURIComponent(returnTo)}`
    : "/api/instagram/connect";
  const buttonLabel =
    label ?? (resume ? "Continue connecting" : "Connect Instagram");

  return (
    <>
      <Button
        className={className}
        disabled={disabled}
        onClick={() => setAsk(true)}
      >
        {buttonLabel}
      </Button>
      <Modal open={ask} onOpenChange={setAsk}>
        <ModalContent
          title={resume ? "Finish connecting Instagram" : "Connect Instagram"}
        >
          <p className="text-sm leading-relaxed text-zinc-400">
            Instagram opens in two steps.{" "}
            <span className="text-zinc-200">
              Logging in is not enough — you must tap Allow.
            </span>
          </p>
          <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-zinc-300">
            <li>
              If asked, log into the Instagram account you want to connect.
            </li>
            <li>
              If Instagram asks to save login info, tap{" "}
              <span className="text-white">Not now</span> or Save — keep going.
            </li>
            <li>
              Tap <span className="text-white">Allow</span> so this app can send
              comment replies. That is the step that connects the account.
            </li>
          </ol>
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <Button size="sm" variant="secondary" onClick={() => setAsk(false)}>
              Cancel
            </Button>
            <Button size="sm" asChild>
              <a href={href}>Continue to Instagram</a>
            </Button>
          </div>
        </ModalContent>
      </Modal>
    </>
  );
}

export function DisconnectInstagramButton({
  accountId,
}: {
  accountId: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [ask, setAsk] = useState(false);

  async function disconnect() {
    setAsk(false);
    setPending(true);
    const response = await fetch("/api/instagram/disconnect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountId }),
    });
    const body = (await response.json()) as {
      success: boolean;
      error?: { message: string };
    };
    setPending(false);
    if (!body.success) {
      toast.error(body.error?.message ?? "Could not disconnect");
      return;
    }
    toast.success("Instagram account disconnected");
    router.refresh();
  }

  return (
    <>
      <Button
        variant="danger"
        size="sm"
        onClick={() => setAsk(true)}
        disabled={pending}
      >
        Disconnect
      </Button>
      <Modal open={ask} onOpenChange={setAsk}>
        <ModalContent title="Disconnect Instagram?">
          <div className="space-y-3 text-sm leading-relaxed text-zinc-400">
            <p>
              All automations for this Instagram account will be{" "}
              <span className="font-medium text-rose-300">
                permanently deleted
              </span>
              . This cannot be undone.
            </p>
            <p>
              Your plan slot stays used by this account. You can reconnect the{" "}
              <span className="font-medium text-white">same</span> Instagram
              account later, but you cannot replace it with a different one
              without upgrading.
            </p>
          </div>
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <Button size="sm" variant="secondary" onClick={() => setAsk(false)}>
              Keep connected
            </Button>
            <Button
              size="sm"
              variant="danger"
              disabled={pending}
              onClick={() => void disconnect()}
            >
              {pending ? "Disconnecting…" : "Delete automations & disconnect"}
            </Button>
          </div>
        </ModalContent>
      </Modal>
    </>
  );
}

/** Compact link-styled connect control for the account switcher. */
export function ConnectInstagramLink({
  canAddAccount = true,
  className,
}: {
  canAddAccount?: boolean;
  className?: string;
}) {
  const [ask, setAsk] = useState(false);
  if (!canAddAccount) {
    return (
      <a href="/dashboard/settings?tab=billing" className={cn(className)}>
        Upgrade plan
      </a>
    );
  }
  return (
    <>
      <button
        type="button"
        onClick={() => setAsk(true)}
        className={cn("text-left", className)}
      >
        + Connect Instagram
      </button>
      <Modal open={ask} onOpenChange={setAsk}>
        <ModalContent title="Connect Instagram">
          <p className="text-sm leading-relaxed text-zinc-400">
            Log in if Instagram asks, then tap{" "}
            <span className="text-white">Allow</span>. Login alone does not
            finish the connection.
          </p>
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <Button size="sm" variant="secondary" onClick={() => setAsk(false)}>
              Cancel
            </Button>
            <Button size="sm" asChild>
              <a href="/api/instagram/connect">Continue to Instagram</a>
            </Button>
          </div>
        </ModalContent>
      </Modal>
    </>
  );
}
