import { Check } from "lucide-react";
import { AuthLink } from "@/components/layout/auth-link";
import { Button } from "@/components/ui/button";
import { plans } from "@/lib/marketing-copy";
import { signupForPlan } from "@/lib/auth/next-path";
import { cn } from "@/lib/utils";

function planCtaHref(name: string) {
  if (name === "Creator" || name === "Pro" || name === "Agency") {
    return signupForPlan(name.toLowerCase() as "creator" | "pro" | "agency");
  }
  return "/auth/signup";
}

export function PlanGrid() {
  return (
    <div className="grid min-w-0 items-stretch gap-5 pt-4 sm:grid-cols-2 xl:grid-cols-4">
      {plans.map((plan) => (
        <div
          key={plan.name}
          className={cn(
            "relative flex h-full min-w-0 flex-col rounded-2xl p-5 sm:p-6",
            plan.popular
              ? "border border-violet-400 bg-gradient-to-b from-violet-700/60 to-[#1a0f33] shadow-[0_0_60px_rgba(124,58,237,0.4)]"
              : "border border-white/10 bg-[#0b0912]/80",
          )}
        >
          {plan.tag ? (
            <p className="absolute right-3 top-0 max-w-[calc(100%-1.5rem)] -translate-y-1/2 truncate rounded-full bg-violet-500 px-3 py-1 text-[10px] font-semibold text-white">
              {plan.tag}
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold">{plan.name}</h3>
          </div>
          <p className="mt-3 text-[32px] font-semibold">
            {plan.price}
            <span className="ml-1 text-sm font-normal text-zinc-400">
              {plan.period}
            </span>
          </p>
          <p className="mt-1 min-h-4 text-xs text-zinc-400">
            {plan.annual ? (
              <>
                {plan.annual}
                <span className="ml-2 text-violet-300">Save 2 months</span>
              </>
            ) : (
              "\u00a0"
            )}
          </p>
          <ul className="mt-5 flex-1 space-y-2 text-[13px] text-zinc-200">
            {plan.points.map((point) => (
              <li key={point} className="flex items-start gap-2">
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-violet-600">
                  <Check className="h-2.5 w-2.5 text-white" />
                </span>
                {point}
              </li>
            ))}
          </ul>
          <Button
            className={cn(
              "mt-6 w-full rounded-xl",
              !plan.popular &&
                "border border-violet-400/50 bg-transparent text-violet-200 hover:bg-violet-600/20",
            )}
            variant={plan.popular ? "primary" : "secondary"}
            asChild
          >
            <AuthLink href={planCtaHref(plan.name)}>{plan.cta}</AuthLink>
          </Button>
        </div>
      ))}
    </div>
  );
}
