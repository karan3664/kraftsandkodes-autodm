import Link from "next/link";
import { MarketingHeader } from "@/components/layout/marketing-header";
import { SiteFooter } from "@/components/layout/site-footer";

export function MarketingChrome({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen min-w-0 overflow-x-clip bg-[#07060c] text-white">
      <MarketingHeader />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {title}
        </h1>
        <div className="prose prose-invert mt-6 max-w-none text-sm leading-relaxed text-zinc-300">
          {children}
        </div>
        <p className="mt-8">
          <Link href="/" className="text-sm text-violet-300 hover:text-white">
            ← Back to home
          </Link>
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
