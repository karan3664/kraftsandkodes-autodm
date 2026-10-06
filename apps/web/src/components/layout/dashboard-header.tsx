"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, LogOut, Menu, Search } from "lucide-react";
import {
  AccountSwitcher,
  type SwitcherAccount,
} from "@/components/layout/account-switcher";
import { Button } from "@/components/ui/button";

export function DashboardHeader({
  name,
  admin,
  accounts,
  selectedAccountId,
  canAddAccount,
  onMenuClick,
}: {
  name: string;
  admin: boolean;
  accounts: SwitcherAccount[];
  selectedAccountId: string | null;
  canAddAccount: boolean;
  onMenuClick: () => void;
}) {
  const router = useRouter();
  const first = name.split(" ")[0] ?? name;

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/auth/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-white/5 bg-[#07060c]/90 px-3 py-2.5 backdrop-blur-xl sm:gap-4 sm:px-4 sm:py-3 lg:px-8">
      <div className="flex shrink-0 items-center lg:hidden">
        <button
          type="button"
          onClick={onMenuClick}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-zinc-200"
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>
      <form
        action="/dashboard/activity"
        className="hidden min-w-0 max-w-md flex-1 md:flex"
      >
        <label className="relative w-full">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            name="q"
            placeholder="Search…"
            className="w-full rounded-full border border-white/10 bg-white/5 py-2 pl-10 pr-4 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-violet-500/50"
          />
        </label>
      </form>
      <div className="ml-auto flex min-w-0 items-center gap-1.5 sm:gap-2">
        <AccountSwitcher
          accounts={accounts}
          selectedId={selectedAccountId}
          canAddAccount={canAddAccount}
        />
        <Link
          href="/dashboard/activity"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-zinc-300 hover:text-white"
          aria-label="Activity"
        >
          <Bell className="h-4 w-4" />
        </Link>
        {admin ? (
          <Button
            variant="ghost"
            size="sm"
            className="hidden sm:inline-flex"
            asChild
          >
            <Link href="/dashboard/system">System</Link>
          </Button>
        ) : null}
        <div className="hidden shrink-0 items-center gap-2 rounded-full border border-white/10 bg-white/5 py-1 pl-1 pr-2 sm:flex sm:pr-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-600 text-xs font-semibold">
            {first.slice(0, 1).toUpperCase()}
          </span>
          <span className="hidden max-w-[120px] truncate text-sm text-zinc-200 md:inline">
            {name}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-9 w-9 shrink-0 px-0 sm:h-auto sm:w-auto sm:px-3"
          onClick={logout}
          aria-label="Sign out"
        >
          <LogOut className="h-4 w-4 sm:hidden" />
          <span className="hidden sm:inline">Sign out</span>
        </Button>
      </div>
    </header>
  );
}
