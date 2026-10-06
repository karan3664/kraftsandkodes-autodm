import Link from "next/link";
import { MarketingHeader } from "@/components/layout/marketing-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { MarketingCta } from "@/components/layout/marketing-cta";

export function MarketingShell({
  children,
  cta = true,
}: {
  children: React.ReactNode;
  cta?: boolean;
}) {
  return (
    <div className="grid-glow flex min-h-dvh min-w-0 flex-col overflow-x-clip text-white">
      <MarketingHeader />
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      {cta ? <MarketingCta /> : null}
      <SiteFooter />
    </div>
  );
}

export function PageHero({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute right-[8%] top-[10%] h-[240px] w-[240px] rounded-full bg-violet-600/25 blur-[100px] sm:h-[360px] sm:w-[360px]" />
      <div className="mx-auto min-w-0 max-w-6xl px-4 pb-8 pt-8 sm:px-6 sm:pt-10">
        <p className="inline-flex max-w-full rounded-full border border-violet-500/30 bg-violet-600/15 px-3 py-1 text-[11px] text-violet-200">
          {eyebrow}
        </p>
        <h1 className="mt-4 max-w-3xl text-[28px] font-semibold leading-[1.15] tracking-tight sm:text-[44px]">
          {title}
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-zinc-400">
          {body}
        </p>
      </div>
    </section>
  );
}

export function ContentCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-[#0b0912]/80 p-4 sm:p-5">
      <h2 className="text-sm font-semibold text-white">{title}</h2>
      <div className="mt-2 space-y-3 text-sm leading-relaxed text-zinc-400">
        {children}
      </div>
    </div>
  );
}

export const LEGAL_NAV = [
  ["/privacy", "Privacy Policy"],
  ["/terms", "Terms & Conditions"],
  ["/refund", "Refund & Cancellation"],
  ["/contact", "Contact"],
  ["/data-deletion", "Data Deletion"],
] as const;

export function LegalNav() {
  return (
    <section className="mx-auto max-w-6xl px-4 pb-4 sm:px-6">
      <div className="flex flex-wrap gap-2">
        {LEGAL_NAV.map(([href, label]) => (
          <Link
            key={href}
            href={href}
            className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-zinc-300 hover:border-violet-400/40 hover:text-white"
          >
            {label}
          </Link>
        ))}
      </div>
    </section>
  );
}
