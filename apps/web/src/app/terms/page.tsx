import Link from "next/link";
import {
  ContentCard,
  LegalNav,
  MarketingShell,
  PageHero,
} from "@/components/layout/marketing-shell";
import { COMPANY_NAME, PRODUCT_NAME, SUPPORT_EMAIL } from "@/lib/hosts";
import { pageSeo } from "@/lib/seo";

export const metadata = pageSeo("/terms", {
  title: "Terms & Conditions — KRAFTSANDKODES",
});

export default function TermsPage() {
  return (
    <MarketingShell>
      <PageHero
        eyebrow="Legal"
        title="Terms & Conditions"
        body={`By creating an account or using ${PRODUCT_NAME} you agree to these terms with ${COMPANY_NAME}. Last updated 5 October 2026.`}
      />
      <LegalNav />
      <section className="mx-auto grid min-w-0 max-w-6xl gap-4 px-4 pb-10 sm:px-6 md:grid-cols-2">
        <ContentCard title="The product">
          <p>
            {PRODUCT_NAME} sends a private Instagram reply after a matching
            comment on media you connect. It is not bulk DM, scraping, or
            unofficial Instagram access. Live webhooks depend on Meta app status
            and App Review.
          </p>
        </ContentCard>
        <ContentCard title="Your account">
          <p>
            You must be able to form a contract, use a professional Instagram
            account, and keep Meta permissions valid. You are responsible for
            automation copy, keywords, and who you connect. Do not use the
            product to spam, impersonate, or break Instagram’s terms.
          </p>
        </ContentCard>
        <ContentCard title="Acceptable use">
          <p>
            One eligible private reply per Meta’s rules. We may suspend
            workspaces that abuse APIs, share logins, or send content that
            violates law or Instagram policies.
          </p>
        </ContentCard>
        <ContentCard title="Payments">
          <p>
            Free is ₹0. Paid plans (Creator, Pro, Agency) are charged through
            Razorpay as shown at checkout on app.kraftsandkodes.com. Access
            follows the plan until it expires or is cancelled. See{" "}
            <Link href="/refund" className="text-violet-300 hover:text-white">
              Refund &amp; Cancellation
            </Link>
            .
          </p>
        </ContentCard>
        <ContentCard title="Availability">
          <p>
            We aim for the service to stay up. Meta outages, DNS, or VPS
            failures can delay replies. We are not liable for lost leads during
            those windows.
          </p>
        </ContentCard>
        <ContentCard title="Contact">
          <p>
            {COMPANY_NAME} —{" "}
            <a
              className="text-violet-300 hover:text-white"
              href={`mailto:${SUPPORT_EMAIL}`}
            >
              {SUPPORT_EMAIL}
            </a>
            . Also{" "}
            <Link href="/privacy" className="text-violet-300 hover:text-white">
              Privacy
            </Link>{" "}
            and{" "}
            <Link href="/contact" className="text-violet-300 hover:text-white">
              Contact
            </Link>
            .
          </p>
        </ContentCard>
      </section>
    </MarketingShell>
  );
}
