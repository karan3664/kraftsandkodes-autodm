import Image from "next/image";
import Link from "next/link";
import { Check, Play, Zap } from "lucide-react";
import { AuthLink } from "@/components/layout/auth-link";
import { Button } from "@/components/ui/button";
import { MarketingHeader } from "@/components/layout/marketing-header";
import { MarketingCta } from "@/components/layout/marketing-cta";
import { PlanGrid } from "@/components/layout/plan-grid";
import { PlanCompare } from "@/components/layout/plan-compare";
import { FaqGrid } from "@/components/layout/faq-grid";
import { SiteFooter } from "@/components/layout/site-footer";
import {
  featureHighlights,
  faqs,
  steps,
  proofFacts,
  audiences,
  refusals,
} from "@/lib/marketing-copy";
import { MARKETING_ORIGIN, PRODUCT_NAME } from "@/lib/hosts";
import { pageSeo, SITE_DESCRIPTION } from "@/lib/seo";

export const metadata = pageSeo("/", { description: SITE_DESCRIPTION });

function HomeJsonLd() {
  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        name: PRODUCT_NAME,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        url: MARKETING_ORIGIN,
        description: SITE_DESCRIPTION,
        offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
      },
      {
        "@type": "FAQPage",
        mainEntity: faqs.slice(0, 5).map((item) => ({
          "@type": "Question",
          name: item.q,
          acceptedAnswer: { "@type": "Answer", text: item.a },
        })),
      },
    ],
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
    />
  );
}

function HeroPreview() {
  return (
    <div className="relative mx-auto w-full max-w-[600px] pt-2 lg:pt-12 lg:pl-8">
      <Image
        src="/brand/instagram-hero-icon.png"
        alt=""
        width={120}
        height={120}
        className="pointer-events-none absolute right-[18%] top-0 z-10 hidden h-[120px] w-[120px] lg:block [mask-image:radial-gradient(circle,black_42%,transparent_68%)]"
        priority
      />
      <p className="pointer-events-none absolute right-0 top-8 z-10 hidden rotate-[-12deg] text-sm font-medium italic text-violet-300 lg:block">
        Automate
        <br />
        Your Growth
      </p>
      <Image
        src="/brand/hero-analytics-icon.png"
        alt=""
        width={85}
        height={90}
        className="pointer-events-none absolute left-0 top-[58%] z-10 hidden h-[90px] w-auto lg:block [mask-image:radial-gradient(circle,black_40%,transparent_68%)]"
      />
      <Image
        src="/brand/hero-dashboard-preview.png"
        alt="KRAFTSANDKODES dashboard overview"
        width={575}
        height={390}
        sizes="(min-width: 1024px) 600px, 100vw"
        className="h-auto w-full [mask-image:radial-gradient(ellipse_at_center,black_72%,transparent_100%)]"
        priority
      />
    </div>
  );
}

export default function HomePage() {
  return (
    <div
      id="top"
      className="grid-glow min-h-screen min-w-0 overflow-x-clip text-white"
    >
      <HomeJsonLd />
      <MarketingHeader />

      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute right-[8%] top-[10%] h-[280px] w-[280px] rounded-full bg-violet-600/25 blur-[100px] sm:h-[420px] sm:w-[420px] sm:blur-[120px]" />
        <div className="mx-auto grid min-w-0 max-w-6xl items-center gap-8 px-4 pb-10 pt-8 sm:px-6 sm:pt-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-600/15 px-3 py-1 text-[11px] text-violet-200">
              <Zap className="h-3 w-3" />
              Instagram automation made for Indian creators
            </p>
            <h1 className="mt-4 text-[34px] font-semibold leading-[1.08] tracking-tight sm:text-[44px] md:text-[52px]">
              One keyword. One Reel.{" "}
              <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                One private reply.
              </span>
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-zinc-400">
              Keyword on a Reel or post you choose. One private reply through
              official Meta APIs. Built for Indian creators — billed in ₹.
            </p>
            <ul className="mt-5 space-y-2.5 text-sm text-zinc-200">
              {[
                "Pick the Reel or post — not the whole profile",
                "Keyword match → one Meta private reply",
                "Pay in ₹ on Razorpay — no USD billing",
              ].map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-600">
                    <Check className="h-3 w-3 text-white" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild>
                <AuthLink href="/auth/signup">Start Free</AuthLink>
              </Button>
              <Button
                variant="secondary"
                className="border-white/15 bg-transparent"
                asChild
              >
                <Link href="/how-it-works">
                  <Play className="h-4 w-4" />
                  See How It Works
                </Link>
              </Button>
            </div>
            <p className="mt-3 text-[11px] text-zinc-500">
              No credit card required · Start in minutes
            </p>
            <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-zinc-500">
              {[
                "Made for India",
                "Pay in ₹",
                "Official Meta API integration",
              ].map((item) => (
                <li key={item} className="flex items-center gap-1.5">
                  <span className="h-1 w-1 rounded-full bg-violet-400" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <HeroPreview />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-4 sm:px-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {proofFacts.map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-white/10 bg-[#0b0912]/80 p-4"
            >
              <item.icon className="h-4 w-4 text-violet-300" />
              <p className="mt-3 text-sm font-semibold text-white">
                {item.title}
              </p>
              <p className="mt-1 text-[12px] leading-relaxed text-zinc-400">
                {item.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section id="features" className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {featureHighlights.map((item) => (
            <div key={item.title} className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-violet-600 text-white shadow-[0_0_28px_rgba(124,58,237,0.6)]">
                <item.icon className="h-5 w-5" />
              </span>
              <span>
                <span className="block text-[13px] font-semibold leading-tight">
                  {item.title}
                </span>
                <span className="mt-1 block text-[11px] leading-snug text-zinc-500">
                  {item.body}
                </span>
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <h2 className="text-center text-[24px] font-semibold sm:text-[28px]">
          Who this is for
        </h2>
        <p className="mx-auto mt-1 max-w-xl text-center text-sm text-zinc-400">
          If the comment is the lead, the private reply is the handoff.
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {audiences.map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-white/10 bg-[#0b0912]/80 p-5"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-600/30 text-violet-200">
                <item.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 text-sm font-semibold">{item.title}</h3>
              <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                {item.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-4 sm:px-6">
        <div className="rounded-3xl border border-violet-500/20 bg-violet-950/20 px-5 py-8 sm:px-8">
          <h2 className="text-[22px] font-semibold sm:text-[26px]">
            What we will not do
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-zinc-400">
            Safer for your Instagram. Clearer for Meta App Review. Honest for
            your audience.
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {refusals.map((item) => (
              <div key={item.title}>
                <p className="flex items-center gap-2 text-sm font-semibold text-white">
                  <item.icon className="h-4 w-4 text-violet-300" />
                  {item.title}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        id="how-it-works"
        className="mx-auto max-w-6xl px-4 py-10 sm:px-6"
      >
        <h2 className="text-center text-[24px] font-semibold sm:text-[28px]">
          How it works
        </h2>
        <p className="mx-auto mt-1 max-w-xl text-center text-sm text-zinc-400">
          Get started in 4 simple steps and automate your Instagram comment
          replies.
        </p>
        <div className="mt-8 flex flex-col gap-3 xl:flex-row xl:items-stretch">
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
                <h3 className="mt-4 text-sm font-semibold">{step.title}</h3>
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

      <section id="pricing" className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <h2 className="text-center text-[24px] font-semibold sm:text-[28px]">
          Simple. Transparent. Creator-Friendly.
        </h2>
        <p className="mx-auto mt-1 max-w-xl text-center text-sm text-zinc-400">
          Start free. Upgrade when your Instagram grows.
        </p>
        <div className="mt-10">
          <PlanGrid />
        </div>
        <PlanCompare />
      </section>

      <section id="faq" className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-[22px] font-semibold sm:text-[26px]">
              Frequently Asked Questions
            </h2>
            <p className="mt-1 text-sm text-zinc-400">
              Everything you need to know about KRAFTSANDKODES.
            </p>
          </div>
          <Button
            size="sm"
            variant="secondary"
            className="hidden border-violet-400/40 bg-transparent sm:inline-flex"
            asChild
          >
            <Link href="/faq">View all FAQs →</Link>
          </Button>
        </div>
        <FaqGrid items={faqs.slice(0, 5)} />
      </section>

      <MarketingCta />
      <SiteFooter />
    </div>
  );
}
