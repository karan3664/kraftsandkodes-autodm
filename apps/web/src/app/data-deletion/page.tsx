import Link from "next/link";
import {
  ContentCard,
  LegalNav,
  MarketingShell,
  PageHero,
} from "@/components/layout/marketing-shell";
import { COMPANY_NAME, PRODUCT_NAME, SUPPORT_EMAIL } from "@/lib/hosts";
import { pageSeo } from "@/lib/seo";

export const metadata = pageSeo("/data-deletion", {
  title: "Data Deletion — KRAFTSANDKODES",
});

export default function DataDeletionPage() {
  return (
    <MarketingShell>
      <PageHero
        eyebrow="Legal"
        title="Data Deletion"
        body={`How to remove your ${PRODUCT_NAME} workspace and what ${COMPANY_NAME} deletes. Use this URL in Meta’s data deletion callback if the app dashboard asks for one. Last updated 5 October 2026.`}
      />
      <LegalNav />
      <section className="mx-auto grid min-w-0 max-w-6xl gap-4 px-4 pb-10 sm:px-6 md:grid-cols-2">
        <ContentCard title="How to request">
          <p>
            Email{" "}
            <a
              className="text-violet-300 hover:text-white"
              href={`mailto:${SUPPORT_EMAIL}`}
            >
              {SUPPORT_EMAIL}
            </a>{" "}
            from the same address you used to sign up. Subject: Data deletion.
            Or disconnect Instagram first in Settings on app.kraftsandkodes.com,
            then ask us to wipe the account.
          </p>
        </ContentCard>
        <ContentCard title="What we delete">
          <p>
            User record, password hash, sessions. Instagram tokens and account
            rows. Automations and keywords. Execution / activity logs. Payment
            identity we stored (order id, status). We aim to complete this
            within 30 days of a verified request.
          </p>
        </ContentCard>
        <ContentCard title="What we cannot erase">
          <p>
            Razorpay and Meta keep records they are required to keep. Cloudflare
            and host logs rotate on their schedules. Emails already in your
            inbox stay with you.
          </p>
        </ContentCard>
        <ContentCard title="Instagram disconnect">
          <p>
            Disconnecting Instagram in the dashboard revokes our stored token
            for that account and stops new automations. It does not delete your
            KRAFTSANDKODES login until you request full deletion.
          </p>
        </ContentCard>
        <ContentCard title="Meta users">
          <p>
            If you connected Instagram and want data gone from our servers, this
            page is the instruction set. Callback URL for Meta:
            https://kraftsandkodes.com/data-deletion
          </p>
        </ContentCard>
        <ContentCard title="Related">
          <p>
            <Link href="/privacy" className="text-violet-300 hover:text-white">
              Privacy Policy
            </Link>
            {" · "}
            <Link href="/contact" className="text-violet-300 hover:text-white">
              Contact
            </Link>
          </p>
        </ContentCard>
      </section>
    </MarketingShell>
  );
}
