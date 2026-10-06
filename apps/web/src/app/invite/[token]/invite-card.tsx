"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BrandLockup } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function InviteCard({
  token,
  preview,
  signedInEmail,
  autoAccept,
}: {
  token: string;
  preview:
    | { email: string; role: string; ownerName: string; expiresAt: string }
    | { error: string };
  signedInEmail: string | null;
  autoAccept: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const next = `/invite/${token}?accept=1`;
  const googleHref = `/api/auth/google?next=${encodeURIComponent(next)}`;

  async function act(action: "accept" | "decline") {
    setBusy(true);
    try {
      const response = await fetch(`/api/team/invite/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = (await response.json()) as {
        success: boolean;
        error?: { message: string };
      };
      if (!json.success) {
        toast.error(json.error?.message ?? "Could not update the invitation.");
        return;
      }
      if (action === "accept") {
        router.push("/dashboard");
        return;
      }
      toast.success("Invitation declined.");
      router.push("/auth/login");
    } catch {
      toast.error("Could not update the invitation.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (autoAccept && !("error" in preview) && signedInEmail) {
      void act("accept");
    }
    // karan: one-shot accept after Google return; upgrade path is a server action.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoAccept]);

  return (
    <div className="grid-glow flex min-h-svh items-center justify-center px-4 py-10 text-white">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0b0912]/90 p-6">
        <BrandLockup />
        <h1 className="mt-6 text-2xl font-semibold">
          You&apos;ve been invited to join KRAFTSANDKODES.
        </h1>
        {"error" in preview ? (
          <p className="mt-3 text-sm text-rose-300">{preview.error}</p>
        ) : (
          <>
            <p className="mt-3 text-sm text-zinc-400">
              Workspace: {preview.ownerName}
            </p>
            <p className="text-sm text-zinc-400">
              Role: {preview.role === "admin" ? "Admin" : "Member"}
            </p>
            <p className="text-sm text-zinc-400">Email: {preview.email}</p>
            <div className="mt-6 flex flex-col gap-3">
              {signedInEmail ? (
                <>
                  <Button disabled={busy} onClick={() => act("accept")}>
                    Accept Invitation
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={busy}
                    onClick={() => act("decline")}
                  >
                    Decline
                  </Button>
                </>
              ) : (
                <Button asChild>
                  <a href={googleHref}>Continue with Google</a>
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
