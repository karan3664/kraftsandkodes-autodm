"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { ConnectInstagramLink } from "@/app/dashboard/instagram/actions";

export type SwitcherAccount = {
  id: string;
  username: string;
  profilePictureUrl: string | null;
};

export function AccountSwitcher({
  accounts,
  selectedId,
  canAddAccount = true,
}: {
  accounts: SwitcherAccount[];
  selectedId: string | null;
  canAddAccount?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const selected =
    accounts.find((item) => item.id === selectedId) ?? accounts[0];

  async function select(accountId: string) {
    setOpen(false);
    if (accountId === selectedId) return;
    const response = await fetch("/api/instagram/select", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountId }),
    });
    if (response.ok) {
      router.refresh();
    }
  }

  if (accounts.length === 0) {
    return (
      <ConnectInstagramLink
        canAddAccount={canAddAccount}
        className="min-w-0 max-w-[9.5rem] truncate rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-zinc-200 sm:max-w-[220px]"
      />
    );
  }

  return (
    <div ref={rootRef} className="relative min-w-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex min-w-0 max-w-[9.5rem] items-center gap-2 rounded-full border border-white/10 bg-white/5 py-1 pl-1 pr-2 text-sm text-white sm:max-w-[220px]"
      >
        {selected.profilePictureUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={selected.profilePictureUrl}
            alt=""
            className="h-7 w-7 shrink-0 rounded-full object-cover"
          />
        ) : (
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-600 text-xs">
            @
          </span>
        )}
        <span className="min-w-0 truncate">@{selected.username}</span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
      </button>
      {open ? (
        <div className="absolute right-0 z-40 mt-2 w-56 rounded-2xl border border-white/10 bg-[#12101a] p-1 shadow-xl">
          {accounts.map((account) => (
            <button
              key={account.id}
              type="button"
              onClick={() => select(account.id)}
              className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-sm text-zinc-200 hover:bg-white/5"
            >
              @{account.username}
            </button>
          ))}
          <ConnectInstagramLink
            canAddAccount={canAddAccount}
            className="mt-1 block w-full rounded-xl px-2 py-2 text-sm text-violet-300 hover:bg-white/5"
          />
        </div>
      ) : null}
    </div>
  );
}
