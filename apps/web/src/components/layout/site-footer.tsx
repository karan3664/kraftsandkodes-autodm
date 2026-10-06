import Link from "next/link";
import { Instagram, Linkedin } from "lucide-react";
import { BrandLockup } from "@/components/brand/logo";
import {
  COMPANY_NAME,
  COMPANY_URL,
  FOUNDER_NAME,
  INSTAGRAM_URL,
  LINKEDIN_URL,
  SUPPORT_EMAIL,
} from "@/lib/hosts";

const links = [
  ["/privacy", "Privacy Policy"],
  ["/terms", "Terms & Conditions"],
  ["/refund", "Refund & Cancellation"],
  ["/contact", "Contact"],
  ["/data-deletion", "Data Deletion"],
] as const;

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-white/5 bg-[#07060c] px-4 py-8 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 text-xs text-zinc-500">
        <div className="flex flex-col items-center gap-4 text-center md:flex-row md:items-center md:justify-between md:text-left">
          <Link href="/">
            <BrandLockup size={56} className="h-12 w-12 sm:h-14 sm:w-14" />
          </Link>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 md:justify-end">
            {links.map(([href, label]) => (
              <Link key={href} href={href} className="hover:text-white">
                {label}
              </Link>
            ))}
          </div>
        </div>
        <div className="flex flex-col items-center gap-3 text-center md:flex-row md:items-center md:justify-between md:text-left">
          <a href={`mailto:${SUPPORT_EMAIL}`} className="hover:text-white">
            {SUPPORT_EMAIL}
          </a>
          <span className="flex items-center gap-4 text-zinc-500">
            <a
              href={COMPANY_URL}
              target="_blank"
              rel="noreferrer"
              className="hover:text-white"
            >
              {COMPANY_NAME}
            </a>
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noreferrer"
              className="hover:text-white"
              aria-label="Instagram @kraftsandkodes"
            >
              <Instagram className="h-4 w-4" />
            </a>
            <a
              href={LINKEDIN_URL}
              target="_blank"
              rel="noreferrer"
              className="hover:text-white"
              aria-label="LinkedIn"
            >
              <Linkedin className="h-4 w-4" />
            </a>
          </span>
          <p className="max-w-xs text-[11px] leading-relaxed md:text-right">
            Official Instagram Login · Encrypted tokens on the server · Pay in
            ₹.
            <br />
            Designed &amp; developed by{" "}
            <a
              href={LINKEDIN_URL}
              target="_blank"
              rel="noreferrer"
              className="hover:text-white"
            >
              {FOUNDER_NAME}
            </a>
            .
            <br />© {new Date().getFullYear()}{" "}
            <a
              href={COMPANY_URL}
              target="_blank"
              rel="noreferrer"
              className="hover:text-white"
            >
              {COMPANY_NAME}
            </a>
            . All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
