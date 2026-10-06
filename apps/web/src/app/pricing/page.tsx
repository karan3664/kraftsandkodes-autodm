import Link from "next/link";
import { PlanGrid } from "@/components/layout/plan-grid";
import { PlanCompare } from "@/components/layout/plan-compare";
import { MarketingShell, PageHero } from "@/components/layout/marketing-shell";
import { COMPANY_NAME } from "@/lib/hosts";
import { pageSeo } from "@/lib/seo";

export const metadata = pageSeo("/pricing", {
  title: "Pricing — KRAFTSANDKODES",
});

export default function PricingPage() {
  return (
    <MarketingShell>
      <PageHero
        eyebrow="Pricing"
        title="Simple. Transparent. Creator-Friendly."
        body="Start free. Upgrade when your Instagram grows."
      />
      <section className="mx-auto max-w-6xl px-4 pb-6 sm:px-6">
        <PlanGrid />
        <PlanCompare />
      </section>
      <section className="mx-auto max-w-6xl px-4 pb-10 sm:px-6">
        <div className="grid min-w-0 gap-4 md:grid-cols-3">
          <div className="min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-[#0b0912]/80 p-4 sm:p-5">
            <h2 className="text-sm font-semibold">Where you pay</h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              Login at app.kraftsandkodes.com, then Settings → Billing. Plans
              are Free, Creator (₹299), Pro (₹599), and Agency (₹999).
            </p>
          </div>
          <div className="min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-[#0b0912]/80 p-4 sm:p-5">
            <h2 className="text-sm font-semibold">Receipts</h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              Successful and failed payments are stored on your account. Email
              receipts send when SMTP is configured on the server.
            </p>
          </div>
          <div className="min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-[#0b0912]/80 p-4 sm:p-5">
            <h2 className="text-sm font-semibold">Refunds</h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              {COMPANY_NAME} processes refunds per the{" "}
              <Link href="/refund" className="text-violet-300 hover:text-white">
                Refund &amp; Cancellation
              </Link>{" "}
              policy.
            </p>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
