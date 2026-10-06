import Link from "next/link";
import {
  ContentCard,
  LegalNav,
  MarketingShell,
  PageHero,
} from "@/components/layout/marketing-shell";
import { COMPANY_NAME, PRODUCT_NAME, SUPPORT_EMAIL } from "@/lib/hosts";
import { pageSeo } from "@/lib/seo";

export const metadata = pageSeo("/privacy", {
  title: "Privacy Policy — KRAFTSANDKODES",
});

export default function PrivacyPage() {
  return (
    <MarketingShell>
      <PageHero
        eyebrow="Legal"
        title="Privacy Policy"
        body={`${COMPANY_NAME} operates ${PRODUCT_NAME} at kraftsandkodes.com and app.kraftsandkodes.com. This page says what we store, why, and how to ask us to delete it. Last updated 5 October 2026.`}
      />
      <LegalNav />
      <section className="mx-auto grid min-w-0 max-w-6xl gap-4 px-4 pb-10 sm:px-6 md:grid-cols-2">
        <ContentCard title="Who we are">
          <p>
            {COMPANY_NAME} (“we”) is the controller for account data on{" "}
            {PRODUCT_NAME}. Support:{" "}
            <a
              className="text-violet-300 hover:text-white"
              href={`mailto:${SUPPORT_EMAIL}`}
            >
              {SUPPORT_EMAIL}
            </a>
            .
          </p>
        </ContentCard>
        <ContentCard title="Data we store">
          <p>
            Name, email, password hash, session cookies. Encrypted Instagram
            access tokens, Instagram user id, username, and media ids you
            connect. Automation rules (keywords, messages, follow-gate). Comment
            webhook execution logs (comment text we processed, match, send
            status). Razorpay order id, payment id, amount, status. We do not
            store card numbers.
          </p>
        </ContentCard>
        <ContentCard title="How we use it">
          <p>
            To authenticate you, run comment-to-private-reply automations
            through official Meta APIs, bill paid plans, email receipts when
            SMTP is set, and debug failures you report.
          </p>
        </ContentCard>
        <ContentCard title="Who else sees it">
          <p>
            Meta (Instagram Login and webhooks). Razorpay (checkout). Hostinger
            VPS and Cloudflare (hosting and DNS). We do not sell your data. We
            do not use unofficial Instagram scrapers.
          </p>
        </ContentCard>
        <ContentCard title="Cookies">
          <p>
            An HTTP-only session cookie ({PRODUCT_NAME} login). It is not an
            advertising cookie.
          </p>
        </ContentCard>
        <ContentCard title="Retention and your rights">
          <p>
            We keep account and logs while the workspace exists. Email{" "}
            <a
              className="text-violet-300 hover:text-white"
              href={`mailto:${SUPPORT_EMAIL}`}
            >
              {SUPPORT_EMAIL}
            </a>{" "}
            from your signup address to access, correct, or delete data. See{" "}
            <Link
              href="/data-deletion"
              className="text-violet-300 hover:text-white"
            >
              Data Deletion
            </Link>
            . Meta and Razorpay keep their own records under their policies.
          </p>
        </ContentCard>
      </section>
    </MarketingShell>
  );
}
