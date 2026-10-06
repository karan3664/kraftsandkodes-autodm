import Link from "next/link";
import {
  MarketingShell,
  PageHero,
  LegalNav,
} from "@/components/layout/marketing-shell";
import { ContactForm } from "@/app/contact/contact-form";
import { COMPANY_NAME, PRODUCT_NAME, SUPPORT_EMAIL } from "@/lib/hosts";
import { pageSeo } from "@/lib/seo";

const cards = [
  {
    title: "Email",
    body: SUPPORT_EMAIL,
    href: `mailto:${SUPPORT_EMAIL}`,
  },
  {
    title: "App",
    body: "app.kraftsandkodes.com",
    href: "https://app.kraftsandkodes.com/auth/login",
  },
  {
    title: "Website",
    body: "kraftsandkodes.com",
    href: "https://kraftsandkodes.com",
  },
];

export const metadata = pageSeo("/contact", {
  title: "Contact — KRAFTSANDKODES",
});

export default function ContactPage() {
  return (
    <MarketingShell>
      <PageHero
        eyebrow="Contact"
        title={`Talk to ${COMPANY_NAME}.`}
        body={`${PRODUCT_NAME} is built by ${COMPANY_NAME}. Use the form to open an email, or write ${SUPPORT_EMAIL} directly.`}
      />
      <LegalNav />
      <section className="mx-auto grid min-w-0 max-w-6xl gap-4 px-4 pb-6 sm:px-6 md:grid-cols-3">
        {cards.map((card) => (
          <a
            key={card.title}
            href={card.href}
            className="min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-[#0b0912]/80 p-4 sm:p-5 hover:border-violet-400/40"
          >
            <p className="text-[11px] uppercase tracking-[0.14em] text-violet-300">
              {card.title}
            </p>
            <p className="mt-2 break-all text-sm font-medium text-white">
              {card.body}
            </p>
          </a>
        ))}
      </section>
      <section className="mx-auto grid min-w-0 max-w-6xl gap-6 px-4 pb-10 sm:px-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <ContactForm />
        <div className="min-w-0 space-y-4 text-sm leading-relaxed text-zinc-400">
          <div className="min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-[#0b0912]/80 p-4 sm:p-5">
            <h2 className="text-sm font-semibold text-white">
              Billing and legal
            </h2>
            <ul className="mt-3 space-y-2">
              <li>
                <Link
                  href="/terms"
                  className="text-violet-300 hover:text-white"
                >
                  Terms &amp; Conditions
                </Link>
              </li>
              <li>
                <Link
                  href="/refund"
                  className="text-violet-300 hover:text-white"
                >
                  Refund &amp; Cancellation
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="text-violet-300 hover:text-white"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/data-deletion"
                  className="text-violet-300 hover:text-white"
                >
                  Data deletion
                </Link>
              </li>
            </ul>
          </div>
          <p>
            For Instagram connection issues, say which account you connected and
            the error shown in the dashboard. Do not email access tokens.
          </p>
        </div>
      </section>
    </MarketingShell>
  );
}
