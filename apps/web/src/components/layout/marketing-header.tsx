"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { BrandLockup } from "@/components/brand/logo";
import { AuthLink } from "@/components/layout/auth-link";
import { Button } from "@/components/ui/button";
import { MARKETING_NAV } from "@/components/layout/nav-items";
import { cn } from "@/lib/utils";

export function MarketingHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-30 border-b border-white/5 bg-[#07060c]/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6 sm:py-3">
        <Link href="/" className="min-w-0 shrink-0">
          <BrandLockup
            size={64}
            className="h-12 w-12 sm:h-14 sm:w-14 lg:h-16 lg:w-16"
          />
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-zinc-400 xl:flex">
          {MARKETING_NAV.map(([href, label]) => {
            const active =
              href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "relative hover:text-white",
                  active &&
                    "text-white after:absolute after:-bottom-1.5 after:left-0 after:h-0.5 after:w-full after:rounded-full after:bg-violet-500",
                )}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            className="hidden h-9 sm:inline-flex"
            asChild
          >
            <AuthLink href="/auth/login">Log in</AuthLink>
          </Button>
          <Button size="sm" className="h-9" asChild>
            <AuthLink href="/auth/signup">
              <span className="sm:hidden">Start</span>
              <span className="hidden sm:inline">Get Started</span>
            </AuthLink>
          </Button>
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-zinc-200 xl:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <div
        className={cn(
          "border-t border-white/5 bg-[#0a0910] xl:hidden",
          open ? "block" : "hidden",
        )}
      >
        <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3">
          {MARKETING_NAV.map(([href, label]) => {
            const active =
              href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={cn(
                  "rounded-xl px-3 py-3 text-sm",
                  active
                    ? "bg-violet-600/20 text-white"
                    : "text-zinc-300 hover:bg-white/5",
                )}
              >
                {label}
              </Link>
            );
          })}
          <AuthLink
            href="/auth/login"
            onClick={() => setOpen(false)}
            className="rounded-xl px-3 py-3 text-sm text-zinc-300 hover:bg-white/5 sm:hidden"
          >
            Log in
          </AuthLink>
        </nav>
      </div>
    </header>
  );
}
