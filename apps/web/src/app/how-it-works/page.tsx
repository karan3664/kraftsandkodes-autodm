import { AuthLink } from "@/components/layout/auth-link";
import { Button } from "@/components/ui/button";
import { MarketingShell, PageHero } from "@/components/layout/marketing-shell";
import { howItWorksDetail, steps } from "@/lib/marketing-copy";
import { pageSeo } from "@/lib/seo";

export const metadata = pageSeo("/how-it-works", {
  title: "How it works — KRAFTSANDKODES",
});

export default function HowItWorksPage() {
  return (
    <MarketingShell>
      <PageHero
        eyebrow="How it works"
        title="Four steps from Instagram comment to private reply."
        body="No scraping. No bulk DMs. You connect a professional account, write a rule, and Meta delivers comments to us over HTTPS."
      />
      <section className="mx-auto max-w-6xl px-4 pb-6 sm:px-6">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-stretch">
          {steps.map((step, index) => (
            <div
              key={step.title}
              className="flex min-w-0 flex-1 items-stretch gap-3"
            >
              <div className="min-w-0 flex-1 overflow-hidden rounded-2xl border border-white/10 bg-[#0b0912]/80 p-4 sm:p-5">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-600 text-sm font-semibold">
                    {index + 1}
                  </span>
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-violet-300">
                    <step.icon className="h-4 w-4" />
                  </span>
                </div>
                <h2 className="mt-4 text-sm font-semibold">{step.title}</h2>
                <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                  {step.body}
                </p>
              </div>
              {index < steps.length - 1 ? (
                <span className="hidden self-center text-lg text-violet-400 xl:block">
                  →
                </span>
              ) : null}
            </div>
          ))}
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-4 pb-10 sm:px-6">
        <h2 className="text-[22px] font-semibold sm:text-[26px]">
          What happens after you connect
        </h2>
        <div className="mt-5 grid min-w-0 gap-4 md:grid-cols-2">
          {howItWorksDetail.map((item) => (
            <div
              key={item.title}
              className="min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-[#0b0912]/80 p-4 sm:p-5"
            >
              <h3 className="text-sm font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                {item.body}
              </p>
            </div>
          ))}
        </div>
        <Button className="mt-8" asChild>
          <AuthLink href="/auth/signup">Create your account →</AuthLink>
        </Button>
      </section>
    </MarketingShell>
  );
}
