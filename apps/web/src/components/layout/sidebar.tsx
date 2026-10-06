"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { BrandLockup } from "@/components/brand/logo";
import { DASHBOARD_NAV } from "@/components/layout/nav-items";
import {
  COMPANY_NAME,
  COMPANY_URL,
  FOUNDER_NAME,
  LINKEDIN_URL,
  PRODUCT_NAME,
} from "@/lib/hosts";
import { cn } from "@/lib/utils";

function BrandCredit() {
  const year = new Date().getFullYear();
  return (
    <p className="px-5 py-4 text-[11px] leading-relaxed text-zinc-500">
      {PRODUCT_NAME}
      <br />
      Designed &amp; developed by{" "}
      <a
        href={LINKEDIN_URL}
        target="_blank"
        rel="noreferrer"
        className="hover:text-white"
      >
        {FOUNDER_NAME}
      </a>
      <br />© {year}{" "}
      <a
        href={COMPANY_URL}
        target="_blank"
        rel="noreferrer"
        className="hover:text-white"
      >
        {COMPANY_NAME}
      </a>
      . All rights reserved.
    </p>
  );
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-1 flex-col gap-1 px-3 py-2">
      {DASHBOARD_NAV.map((item) => {
        const active =
          item.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition",
              active
                ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-[0_8px_24px_rgba(124,58,237,0.35)]"
                : "text-zinc-400 hover:bg-white/5 hover:text-white",
            )}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden w-[248px] shrink-0 border-r border-white/5 bg-black/70 lg:flex lg:flex-col">
      <Link href="/dashboard" className="flex justify-center px-5 py-6">
        <BrandLockup size={72} className="h-14 w-14 xl:h-[72px] xl:w-[72px]" />
      </Link>
      <NavLinks />
      <BrandCredit />
    </aside>
  );
}

export function MobileSidebar({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <div
      className={cn(
        "fixed inset-0 z-50 lg:hidden",
        open ? "pointer-events-auto" : "pointer-events-none",
      )}
    >
      <button
        type="button"
        aria-label="Close menu"
        className={cn(
          "absolute inset-0 bg-black/70 transition-opacity",
          open ? "opacity-100" : "opacity-0",
        )}
        onClick={onClose}
      />
      <aside
        className={cn(
          "absolute inset-y-0 left-0 flex w-[min(288px,88vw)] flex-col border-r border-white/10 bg-[#0a0910] shadow-2xl transition-transform duration-200",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between px-4 py-4">
          <Link href="/dashboard" onClick={onClose} className="mx-auto">
            <BrandLockup size={64} className="h-14 w-14" />
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-zinc-300"
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <NavLinks onNavigate={onClose} />
        <BrandCredit />
      </aside>
    </div>
  );
}
