"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  CreditCard,
  Instagram,
  ListChecks,
  MessageCircle,
  Sparkles,
  Workflow,
} from "lucide-react";
import { Modal, ModalContent } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";

export const TOUR_STORAGE_KEY = "autodm_tour_v1";
export const TOUR_START_EVENT = "autodm-tour-start";

export function startAppTour() {
  window.dispatchEvent(new Event(TOUR_START_EVENT));
}

const STEPS = [
  {
    icon: Sparkles,
    title: "Welcome to KRAFTSANDKODES",
    body: "This app watches comments on your Instagram Reels and posts, matches keywords you set, and sends one private reply (DM) through Meta’s official API. It does not send bulk DMs.",
  },
  {
    icon: Instagram,
    title: "1. Connect Instagram",
    body: "On Overview, tap Connect Instagram. Use a Creator or Business account. Instagram may ask you to log in first — then tap Allow. Login alone does not finish the connection.",
    href: "/dashboard",
    hrefLabel: "Go to Overview",
  },
  {
    icon: ListChecks,
    title: "2. Pick a Reel or post",
    body: "Open Instagram in the sidebar. Sync media if needed, then choose the specific Reel or post this campaign should watch. Rules are media-specific, not your whole profile.",
    href: "/dashboard/instagram",
    hrefLabel: "Open Instagram",
  },
  {
    icon: Workflow,
    title: "3. Create an automation",
    body: "Go to Automations → Create. Set keywords (for example LINK or PRICE), write the private reply with your link, and optionally require a follow first. Enable the rule when you are ready.",
    href: "/dashboard/automations/new",
    hrefLabel: "Create automation",
  },
  {
    icon: MessageCircle,
    title: "4. Comment becomes a DM",
    body: "When someone comments a matching keyword, Meta sends us the comment. We send one eligible private reply. The same person is not messaged again as bulk outreach.",
  },
  {
    icon: Activity,
    title: "5. Check Activity",
    body: "Activity shows matched comments, sent replies, skips, and failures. Free plans keep 7 days of history. Export CSV from Activity when you need a record.",
    href: "/dashboard/activity",
    hrefLabel: "Open Activity",
  },
  {
    icon: CreditCard,
    title: "6. Plans and billing",
    body: "Free includes 100 automated replies/month and 1 active automation. Upgrade in Settings → Billing (₹ via Razorpay). Replay this tour anytime from Settings → General.",
    href: "/dashboard/settings?tab=billing",
    hrefLabel: "Open Billing",
  },
] as const;

export function AppTour() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!window.localStorage.getItem(TOUR_STORAGE_KEY)) {
      setOpen(true);
    }
    function onStart() {
      setStep(0);
      setOpen(true);
    }
    window.addEventListener(TOUR_START_EVENT, onStart);
    return () => window.removeEventListener(TOUR_START_EVENT, onStart);
  }, []);

  function finish() {
    window.localStorage.setItem(TOUR_STORAGE_KEY, "1");
    setOpen(false);
    setStep(0);
  }

  const current = STEPS[step];
  if (!current) return null;
  const last = step === STEPS.length - 1;
  const Icon = current.icon;

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (!next) finish();
      }}
    >
      <ModalContent title={`App tour · ${step + 1} of ${STEPS.length}`}>
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-violet-600 text-white">
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-white">
              {current.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              {current.body}
            </p>
          </div>
        </div>
        {"href" in current && current.href ? (
          <Button className="mt-4 w-full" variant="secondary" asChild>
            <Link href={current.href}>{current.hrefLabel}</Link>
          </Button>
        ) : null}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            className="text-xs text-zinc-500 hover:text-white"
            onClick={finish}
          >
            Skip tour
          </button>
          <div className="flex gap-2">
            {step > 0 ? (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setStep((value) => value - 1)}
              >
                Back
              </Button>
            ) : null}
            {last ? (
              <Button size="sm" onClick={finish}>
                Done
              </Button>
            ) : (
              <Button size="sm" onClick={() => setStep((value) => value + 1)}>
                Next
              </Button>
            )}
          </div>
        </div>
      </ModalContent>
    </Modal>
  );
}
