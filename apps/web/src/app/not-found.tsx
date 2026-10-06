import Link from "next/link";
import { AuthLink } from "@/components/layout/auth-link";
import { MarketingShell } from "@/components/layout/marketing-shell";
import { Button } from "@/components/ui/button";
import { MARKETING_ORIGIN } from "@/lib/hosts";

const homeHref = process.env.NODE_ENV === "production" ? MARKETING_ORIGIN : "/";

export default function NotFound() {
  return (
    <MarketingShell cta={false}>
      <section className="relative flex flex-1 flex-col justify-center overflow-hidden px-4 py-16 sm:px-6">
        <div className="pointer-events-none absolute right-[8%] top-[10%] h-[240px] w-[240px] rounded-full bg-violet-600/25 blur-[100px] sm:h-[360px] sm:w-[360px]" />
        <div className="relative mx-auto w-full max-w-6xl">
          <p className="inline-flex rounded-full border border-violet-500/30 bg-violet-600/15 px-3 py-1 text-[11px] text-violet-200">
            404
          </p>
          <h1 className="mt-4 max-w-3xl text-[28px] font-semibold leading-[1.15] tracking-tight sm:text-[44px]">
            This page is not here.
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-zinc-400">
            That URL is missing or mistyped. Go back to the homepage, or log in
            if you were looking for the app.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild>
              <Link href={homeHref}>Back to home</Link>
            </Button>
            <Button variant="secondary" asChild>
              <AuthLink href="/auth/login">Log in</AuthLink>
            </Button>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
