import Link from "next/link";
import {
  ContentCard,
  LegalNav,
  MarketingShell,
  PageHero,
} from "@/components/layout/marketing-shell";
import { COMPANY_NAME, PRODUCT_NAME, SUPPORT_EMAIL } from "@/lib/hosts";
import { pageSeo } from "@/lib/seo";

export const metadata = pageSeo("/refund", {
  title: "Refund & Cancellation — KRAFTSANDKODES",
});

export default function RefundPage() {
  return (
    <MarketingShell>
      <PageHero
        eyebrow="Legal"
        title="Refund & Cancellation"
        body={`${COMPANY_NAME} charges ${PRODUCT_NAME} paid plans through Razorpay. Free has nothing to refund. Last updated 5 October 2026.`}
      />
      <LegalNav />
      <section className="mx-auto grid min-w-0 max-w-6xl gap-4 px-4 pb-10 sm:px-6 md:grid-cols-2">
        <ContentCard title="How you pay">
          <p>
            Checkout is inside the app (Settings → Billing). Merchant of record
            is {COMPANY_NAME}. We store order id, payment id, amount, and
            status. Card data stays with Razorpay.
          </p>
        </ContentCard>
        <ContentCard title="Cancellation">
          <p>
            Email{" "}
            <a
              className="text-violet-300 hover:text-white"
              href={`mailto:${SUPPORT_EMAIL}`}
            >
              {SUPPORT_EMAIL}
            </a>{" "}
            from the account email to cancel a paid plan. Access continues until
            the current paid period ends. We do not auto-prorate unused days
            unless a refund applies below.
          </p>
        </ContentCard>
        <ContentCard title="Refunds we issue">
          <p>
            Duplicate charges. Confirmed technical failure on our side that
            blocked the product after a live (non-test) payment. Test-mode
            Razorpay payments are not live money and are not refunded as INR.
          </p>
        </ContentCard>
        <ContentCard title="Case-by-case">
          <p>
            Feature dissatisfaction after successful use is reviewed case by
            case. Include Razorpay payment id and the email on the account.
            Target response: 5 business days.
          </p>
        </ContentCard>
        <ContentCard title="How to request">
          <p>
            Write{" "}
            <a
              className="text-violet-300 hover:text-white"
              href={`mailto:${SUPPORT_EMAIL}`}
            >
              {SUPPORT_EMAIL}
            </a>{" "}
            or use{" "}
            <Link href="/contact" className="text-violet-300 hover:text-white">
              Contact
            </Link>{" "}
            with topic Billing.
          </p>
        </ContentCard>
        <ContentCard title="Related">
          <p>
            <Link href="/terms" className="text-violet-300 hover:text-white">
              Terms &amp; Conditions
            </Link>
            {" · "}
            <Link href="/pricing" className="text-violet-300 hover:text-white">
              Pricing
            </Link>
          </p>
        </ContentCard>
      </section>
    </MarketingShell>
  );
}
