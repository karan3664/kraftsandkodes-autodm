import Link from "next/link";
import { AuthLink } from "@/components/layout/auth-link";
import { Button } from "@/components/ui/button";
import { FaqGrid } from "@/components/layout/faq-grid";
import { MarketingShell, PageHero } from "@/components/layout/marketing-shell";
import { SUPPORT_EMAIL } from "@/lib/hosts";
import { pageSeo } from "@/lib/seo";

export const metadata = pageSeo("/faq", {
  title: "FAQ — KRAFTSANDKODES",
});

export default function FaqPage() {
  return (
    <MarketingShell>
      <PageHero
        eyebrow="FAQ"
        title="Questions people actually ask."
        body="Safety, Instagram account type, App Review, billing, and what a private reply is — and is not."
      />
      <section className="mx-auto max-w-6xl px-4 pb-8 sm:px-6">
        <FaqGrid />
        <p className="mt-8 text-sm text-zinc-400">
          Still stuck?{" "}
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="text-violet-300 hover:text-white"
          >
            {SUPPORT_EMAIL}
          </a>{" "}
          or the{" "}
          <Link href="/contact" className="text-violet-300 hover:text-white">
            contact page
          </Link>
          .
        </p>
        <Button className="mt-6" asChild>
          <AuthLink href="/auth/signup">Get Started →</AuthLink>
        </Button>
      </section>
    </MarketingShell>
  );
}
