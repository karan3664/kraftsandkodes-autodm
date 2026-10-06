import { BrandLogo } from "@/components/brand/logo";
import { AuthLink } from "@/components/layout/auth-link";
import { Button } from "@/components/ui/button";

export function MarketingCta() {
  return (
    <section className="mx-auto max-w-6xl px-4 pb-10 sm:px-6">
      <div className="flex flex-col items-stretch justify-between gap-4 rounded-2xl border border-violet-400/40 bg-gradient-to-r from-violet-600/45 via-violet-700/35 to-fuchsia-700/20 px-4 py-5 sm:px-6 md:flex-row md:items-center">
        <div className="flex items-center gap-3 sm:gap-4">
          <BrandLogo size={72} className="h-14 w-14 sm:h-[72px] sm:w-[72px]" />
          <div className="min-w-0">
            <p className="text-base font-semibold">
              Ready to automate your Instagram?
            </p>
            <p className="text-xs text-zinc-200">
              Save time, respond faster, and turn comments into real
              opportunities.
            </p>
          </div>
        </div>
        <Button className="w-full shrink-0 md:w-auto" asChild>
          <AuthLink href="/auth/signup">Get Started Now →</AuthLink>
        </Button>
      </div>
    </section>
  );
}
