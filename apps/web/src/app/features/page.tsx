import Link from "next/link";
import { AuthLink } from "@/components/layout/auth-link";
import { Button } from "@/components/ui/button";
import { MarketingShell, PageHero } from "@/components/layout/marketing-shell";
import { featureDetails } from "@/lib/marketing-copy";
import { pageSeo } from "@/lib/seo";

export const metadata = pageSeo("/features", {
  title: "Features — KRAFTSANDKODES",
});

export default function FeaturesPage() {
  return (
    <MarketingShell>
      <PageHero
        eyebrow="Features"
        title="Everything you need to turn comments into conversations."
        body="KRAFTSANDKODES watches comments on the posts and reels you choose, matches keywords you set, and sends one private reply through official Meta APIs."
      />
      <section className="mx-auto max-w-6xl px-4 pb-10 sm:px-6">
        <div className="grid min-w-0 gap-4 sm:grid-cols-2">
          {featureDetails.map((item) => (
            <div
              key={item.title}
              className="min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-[#0b0912]/80 p-4 sm:p-5"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-violet-600 text-white shadow-[0_0_28px_rgba(124,58,237,0.45)]">
                <item.icon className="h-5 w-5" />
              </span>
              <h2 className="mt-4 text-base font-semibold">{item.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                {item.body}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild>
            <AuthLink href="/auth/signup">Get Started →</AuthLink>
          </Button>
          <Button variant="secondary" asChild>
            <Link href="/how-it-works">See how it works</Link>
          </Button>
        </div>
      </section>
    </MarketingShell>
  );
}
