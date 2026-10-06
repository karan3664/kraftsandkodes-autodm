"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar, MobileSidebar } from "@/components/layout/sidebar";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { AppTour } from "@/components/layout/app-tour";
import type { SwitcherAccount } from "@/components/layout/account-switcher";

export function DashboardShell({
  name,
  admin,
  accounts,
  selectedAccountId,
  canAddAccount,
  children,
}: {
  name: string;
  admin: boolean;
  accounts: SwitcherAccount[];
  selectedAccountId: string | null;
  canAddAccount: boolean;
  children: React.ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [menuOpen]);

  return (
    <div className="flex min-h-svh bg-[#07060c]">
      <Sidebar />
      <MobileSidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardHeader
          name={name}
          admin={admin}
          accounts={accounts}
          selectedAccountId={selectedAccountId}
          canAddAccount={canAddAccount}
          onMenuClick={() => setMenuOpen(true)}
        />
        <main className="min-w-0 flex-1 overflow-x-clip px-3 py-5 sm:px-4 sm:py-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
      <AppTour />
    </div>
  );
}
