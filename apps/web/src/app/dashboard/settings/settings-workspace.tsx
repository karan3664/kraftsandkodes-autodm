"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  Copy,
  CreditCard,
  Instagram,
  Link2,
  Settings,
  Shield,
  Sparkles,
  Trash2,
  UserRound,
  Users,
} from "lucide-react";
import { InstagramMark } from "@/components/brand/instagram-mark";
import {
  PayButton,
  openRazorpayCheckout,
  type CheckoutOrder,
} from "@/components/billing/pay-button";
import {
  canCancelPayment,
  canResendEmail,
  canRetryCheckout,
  paymentBadgeLabel,
} from "@/lib/payment-actions";
import {
  ACCOUNT_LIMITS,
  REPLY_LIMITS,
  TEAM_MEMBER_LIMITS,
  normalizePlan,
  planDisplayName,
  type PlanSlug,
} from "@/lib/plans";
import { DisconnectInstagramButton } from "../instagram/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal, ModalContent } from "@/components/ui/modal";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { startAppTour } from "@/components/layout/app-tour";
import { TeamPanel } from "./team-panel";

type Tab =
  | "general"
  | "billing"
  | "team"
  | "instagram"
  | "webhooks"
  | "notifications"
  | "security"
  | "danger";

const TABS: Array<{
  id: Tab;
  label: string;
  icon: typeof UserRound;
  adminOnly?: boolean;
}> = [
  { id: "general", label: "General", icon: UserRound },
  { id: "billing", label: "Billing", icon: CreditCard },
  { id: "team", label: "Team", icon: Users },
  { id: "instagram", label: "Instagram", icon: Instagram },
  { id: "webhooks", label: "Webhooks", icon: Link2, adminOnly: true },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "security", label: "Security", icon: Shield, adminOnly: true },
  { id: "danger", label: "Danger Zone", icon: Trash2, adminOnly: true },
];

function formatWhen(value: string | null) {
  if (!value) return "Not yet";
  return new Date(value).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function SettingsWorkspace({
  admin,
  workspaceRole = "owner",
  canBilling = true,
  canTeam = false,
  initialTab = "general",
  highlightPlan = null,
  user,
  accounts,
  stats,
  webhookUrl,
  verifyTokenConfigured,
  metaConfigured,
  mock,
  paymentsConfigured,
  mailConfigured,
  payments,
  team = null,
  canAddAccount,
}: {
  admin: boolean;
  workspaceRole?: "owner" | "admin" | "member";
  canBilling?: boolean;
  canTeam?: boolean;
  initialTab?: Tab;
  highlightPlan?: "creator" | "pro" | "agency" | null;
  user: {
    name: string;
    email: string;
    createdAt: string;
    plan: string;
    planExpiresAt?: string | null;
  };
  accounts: Array<{
    id: string;
    username: string;
    instagramUserId: string;
    profilePictureUrl: string | null;
    connectedAt: string;
    webhookStatus: string;
    automations: number;
  }>;
  stats: {
    media: number;
    comments: number;
    automations: number;
    sent: number;
  };
  webhookUrl: string;
  verifyTokenConfigured: boolean;
  metaConfigured: boolean;
  mock: boolean;
  paymentsConfigured: boolean;
  mailConfigured: boolean;
  payments: Array<{
    id: string;
    planLabel: string;
    amount: number;
    status: string;
    emailStatus: string;
    razorpayOrderId: string;
    razorpayPaymentId: string | null;
    failureReason: string | null;
    createdAt: string;
  }>;
  team?: {
    owner: { id: string; name: string; role: "owner"; status: "accepted" };
    members: Array<{
      id: string;
      email: string;
      name: string | null;
      role: "admin" | "member";
      status: string;
      accountIds: string[];
      inviteExpiresAt: string | null;
    }>;
    used: number;
    limit: number;
    teamLive: boolean;
    leftoverTeam: boolean;
    canInvite: boolean;
  } | null;
  canAddAccount: boolean;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [emailOn, setEmailOn] = useState(false);
  const [alertsOn, setAlertsOn] = useState(true);
  const [digestOn, setDigestOn] = useState(false);
  const [testing, setTesting] = useState(false);
  const [receiptBusy, setReceiptBusy] = useState<string | null>(null);
  const [cancelReceiptId, setCancelReceiptId] = useState<string | null>(null);
  const webhookOk = accounts.some(
    (item) => item.webhookStatus === "active" || item.webhookStatus === "mock",
  );

  async function copy(value: string, label: string) {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} copied`);
  }

  async function receiptAction(id: string, action: "retry" | "cancel") {
    setReceiptBusy(`${id}:${action}`);
    try {
      const response = await fetch(`/api/payments/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const body = (await response.json()) as {
        success: boolean;
        data?: CheckoutOrder & {
          kind?: "checkout" | "email";
          emailStatus?: string;
        };
        error?: { message: string };
      };
      if (!body.success || !body.data) {
        toast.error(body.error?.message ?? "Could not update that receipt.");
        return;
      }
      if (action === "cancel") {
        toast.success("Checkout cancelled.");
        router.refresh();
        return;
      }
      if (body.data.kind === "email") {
        toast.success(
          body.data.emailStatus === "sent"
            ? "Receipt emailed."
            : "Receipt still could not be emailed. Check SMTP.",
        );
        router.refresh();
        return;
      }
      openRazorpayCheckout({
        order: body.data,
        label: "Retry payment",
        name: user.name,
        email: user.email,
        onVerified: () => router.refresh(),
        onSettled: () => setReceiptBusy(null),
      });
      return;
    } catch {
      toast.error("Could not update that receipt.");
    } finally {
      setReceiptBusy((current) =>
        current === `${id}:${action}` ? null : current,
      );
    }
  }

  async function testWebhook() {
    setTesting(true);
    const response = await fetch("/api/webhooks/instagram");
    setTesting(false);
    if (response.status === 403 || response.ok) {
      toast.success("Webhook endpoint is reachable.");
      return;
    }
    toast.error(`Webhook check failed (${response.status}).`);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 shadow-[0_0_28px_rgba(124,58,237,0.45)]">
            <Settings className="h-6 w-6 text-white" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold text-white">Settings</h1>
            <p className="text-sm text-zinc-400">
              {admin
                ? "Manage your account, Instagram connection, webhooks and preferences."
                : "Manage your account, Instagram connection and preferences."}
            </p>
          </div>
        </div>
        {admin ? (
          <div className="flex gap-2">
            <Button variant="secondary" asChild>
              <Link href="/dashboard/system">Documentation</Link>
            </Button>
          </div>
        ) : null}
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/30 p-1">
        <div className="flex flex-wrap gap-1">
          {TABS.filter((item) => {
            if (item.adminOnly && !admin) return false;
            if (item.id === "billing" && !canBilling) return false;
            if (item.id === "team" && !canTeam) return false;
            return true;
          }).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={cn(
                "flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm whitespace-nowrap",
                tab === item.id
                  ? "bg-violet-600 text-white"
                  : "text-zinc-400 hover:text-white",
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {tab === "general" ? (
        <section className="rounded-3xl border border-white/10 bg-zinc-950/70 p-5">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-base font-semibold text-white">
                <UserRound className="h-4 w-4 text-violet-300" />
                Account Information
              </h2>
              <p className="text-xs text-zinc-500">Your workspace identity.</p>
            </div>
          </div>
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-violet-600 text-xl font-semibold">
              {user.name.slice(0, 1).toUpperCase()}
            </span>
            <div className="grid flex-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-xs text-zinc-500">Name</p>
                <p className="text-sm text-white">{user.name}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500">Email</p>
                <p className="text-sm text-white">{user.email}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500">Member since</p>
                <p className="text-sm text-white">
                  {formatWhen(user.createdAt)}
                </p>
              </div>
              <div>
                <p className="text-xs text-zinc-500">Role</p>
                <p className="text-sm text-white">
                  {workspaceRole === "owner"
                    ? "Owner"
                    : workspaceRole === "admin"
                      ? "Admin"
                      : "Member"}
                </p>
              </div>
              <div>
                <p className="text-xs text-zinc-500">Plan</p>
                <p className="text-sm text-white">
                  {planDisplayName(user.plan)}
                  {user.planExpiresAt
                    ? ` · until ${new Date(
                        user.planExpiresAt,
                      ).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}`
                    : ""}
                </p>
              </div>
            </div>
          </div>
          <p className="mt-4 text-xs text-zinc-500">
            {stats.sent} automated replies recorded.
          </p>
        </section>
      ) : null}

      {tab === "general" ? (
        <section className="rounded-3xl border border-white/10 bg-zinc-950/70 p-5">
          <h2 className="flex items-center gap-2 text-base font-semibold text-white">
            <Sparkles className="h-4 w-4 text-violet-300" />
            App tour
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            Walk through connect Instagram, pick a Reel or post, create a
            keyword rule, and how a comment becomes a private reply.
          </p>
          <Button
            className="mt-4"
            variant="secondary"
            onClick={() => {
              startAppTour();
              toast.success("Tour started");
            }}
          >
            Replay app tour
          </Button>
        </section>
      ) : null}

      {tab === "billing" && canBilling ? (
        <section className="rounded-3xl border border-white/10 bg-zinc-950/70 p-5">
          <h2 className="flex items-center gap-2 text-base font-semibold text-white">
            <CreditCard className="h-4 w-4 text-violet-300" />
            Billing
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            Razorpay checkout in ₹. Success and failure are saved, and a receipt
            is emailed to {user.email}.
          </p>
          <div className="mt-4 rounded-2xl border border-violet-400/40 bg-violet-600/10 p-4">
            <p className="text-xs uppercase tracking-wide text-violet-300">
              Your current plan
            </p>
            <p className="mt-1 text-2xl font-semibold text-white">
              {planDisplayName(user.plan)}
            </p>
            <p className="mt-2 text-sm text-zinc-300">
              {(() => {
                const slug = normalizePlan(user.plan) as PlanSlug;
                const replies = REPLY_LIMITS[slug].toLocaleString("en-IN");
                const accounts = ACCOUNT_LIMITS[slug];
                const seats = TEAM_MEMBER_LIMITS[slug];
                const bits = [
                  `${replies} replies / month`,
                  `${accounts} Instagram account${accounts === 1 ? "" : "s"}`,
                ];
                if (seats > 0) bits.push(`${seats} team seats`);
                return bits.join(" · ");
              })()}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              {user.planExpiresAt
                ? `Active until ${new Date(
                    user.planExpiresAt,
                  ).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}`
                : "Free plan — upgrade below for higher limits."}
            </p>
          </div>
          {team?.leftoverTeam ? (
            <p className="mt-2 text-sm text-amber-200">
              Your new plan does not include team members. Team data is kept.
              Resolve the team from Settings → Team, or upgrade to Agency.
            </p>
          ) : null}
          {!mailConfigured ? (
            <p className="mt-2 text-sm text-amber-300">
              SMTP is not set. Payments still save; receipts will not send until
              SMTP_HOST is configured.
            </p>
          ) : null}
          {!paymentsConfigured ? (
            <p className="mt-4 text-sm text-amber-300">
              Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET, then restart the app.
            </p>
          ) : (
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <div
                className={cn(
                  "rounded-2xl border bg-black/30 p-4",
                  normalizePlan(user.plan) === "creator" ||
                    highlightPlan === "creator"
                    ? "border-violet-400 shadow-[0_0_28px_rgba(124,58,237,0.35)]"
                    : "border-white/10",
                )}
              >
                <p className="text-sm font-semibold text-white">
                  Creator
                  {normalizePlan(user.plan) === "creator" ? (
                    <span className="ml-2 text-[10px] font-medium uppercase tracking-wide text-emerald-300">
                      Current
                    </span>
                  ) : highlightPlan === "creator" ? (
                    <span className="ml-2 text-[10px] font-medium uppercase tracking-wide text-violet-300">
                      Selected
                    </span>
                  ) : null}
                </p>
                <p className="mt-1 text-2xl font-semibold text-white">₹299</p>
                <p className="mt-3">
                  <PayButton
                    amountPaise={29900}
                    label="Pay ₹299"
                    name={user.name}
                    email={user.email}
                  />
                </p>
                <p className="mt-3 text-xs text-zinc-400">
                  ₹2,999/year · Save 2 months
                </p>
                <p className="mt-2">
                  <PayButton
                    amountPaise={299900}
                    label="Pay ₹2,999/year"
                    name={user.name}
                    email={user.email}
                  />
                </p>
              </div>
              <div
                className={cn(
                  "rounded-2xl border bg-black/30 p-4",
                  normalizePlan(user.plan) === "pro" || highlightPlan === "pro"
                    ? "border-violet-400 shadow-[0_0_28px_rgba(124,58,237,0.35)]"
                    : "border-violet-500/30",
                )}
              >
                <p className="text-sm font-semibold text-white">
                  Pro
                  {normalizePlan(user.plan) === "pro" ? (
                    <span className="ml-2 text-[10px] font-medium uppercase tracking-wide text-emerald-300">
                      Current
                    </span>
                  ) : highlightPlan === "pro" ? (
                    <span className="ml-2 text-[10px] font-medium uppercase tracking-wide text-violet-300">
                      Selected
                    </span>
                  ) : null}
                </p>
                <p className="mt-1 text-2xl font-semibold text-white">₹599</p>
                <p className="mt-3">
                  <PayButton
                    amountPaise={59900}
                    label="Pay ₹599"
                    name={user.name}
                    email={user.email}
                  />
                </p>
                <p className="mt-3 text-xs text-zinc-400">
                  ₹5,999/year · Save 2 months
                </p>
                <p className="mt-2">
                  <PayButton
                    amountPaise={599900}
                    label="Pay ₹5,999/year"
                    name={user.name}
                    email={user.email}
                  />
                </p>
              </div>
              <div
                className={cn(
                  "rounded-2xl border bg-black/30 p-4",
                  normalizePlan(user.plan) === "agency" ||
                    highlightPlan === "agency"
                    ? "border-violet-400 shadow-[0_0_28px_rgba(124,58,237,0.35)]"
                    : "border-white/10",
                )}
              >
                <p className="text-sm font-semibold text-white">
                  Agency
                  {normalizePlan(user.plan) === "agency" ? (
                    <span className="ml-2 text-[10px] font-medium uppercase tracking-wide text-emerald-300">
                      Current
                    </span>
                  ) : highlightPlan === "agency" ? (
                    <span className="ml-2 text-[10px] font-medium uppercase tracking-wide text-violet-300">
                      Selected
                    </span>
                  ) : null}
                </p>
                <p className="mt-1 text-2xl font-semibold text-white">₹999</p>
                <p className="mt-3">
                  <PayButton
                    amountPaise={99900}
                    label="Pay ₹999"
                    name={user.name}
                    email={user.email}
                  />
                </p>
                <p className="mt-3 text-xs text-zinc-400">
                  ₹9,999/year · Save 2 months
                </p>
                <p className="mt-2">
                  <PayButton
                    amountPaise={999900}
                    label="Pay ₹9,999/year"
                    name={user.name}
                    email={user.email}
                  />
                </p>
              </div>
            </div>
          )}
          {payments.length > 0 ? (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-white">Receipts</h3>
              <ul className="mt-3 divide-y divide-white/5">
                {payments.map((item) => {
                  const showRetry =
                    canRetryCheckout(item) || canResendEmail(item);
                  const showCancel = canCancelPayment(item.status);
                  const statusLabel = paymentBadgeLabel(
                    item.status,
                    item.failureReason,
                  );
                  return (
                    <li
                      key={item.id}
                      className="flex min-w-0 flex-col gap-3 py-3 text-sm sm:flex-row sm:flex-wrap sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="text-white">
                          {item.planLabel} · ₹{(item.amount / 100).toFixed(2)}
                        </p>
                        <p className="break-all text-xs text-zinc-500">
                          {formatWhen(item.createdAt)} · {item.razorpayOrderId}
                          {item.failureReason ? ` · ${item.failureReason}` : ""}
                        </p>
                      </div>
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <Badge
                          tone={
                            statusLabel === "paid"
                              ? "success"
                              : statusLabel === "cancelled" ||
                                  item.status === "refunded"
                                ? "neutral"
                                : item.status === "failed"
                                  ? "danger"
                                  : "neutral"
                          }
                        >
                          {statusLabel}
                        </Badge>
                        <Badge
                          tone={
                            item.emailStatus === "sent"
                              ? "success"
                              : item.emailStatus === "skipped"
                                ? "neutral"
                                : "warning"
                          }
                        >
                          email {item.emailStatus}
                        </Badge>
                        {showRetry ? (
                          <Button
                            size="sm"
                            className="h-8 px-3"
                            disabled={receiptBusy !== null}
                            onClick={() => void receiptAction(item.id, "retry")}
                          >
                            {receiptBusy === `${item.id}:retry`
                              ? "Working…"
                              : canRetryCheckout(item)
                                ? "Retry"
                                : "Resend email"}
                          </Button>
                        ) : null}
                        {showCancel ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-8 px-3"
                            disabled={receiptBusy !== null}
                            onClick={() => setCancelReceiptId(item.id)}
                          >
                            {receiptBusy === `${item.id}:cancel`
                              ? "Working…"
                              : "Cancel"}
                          </Button>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}

      {tab === "team" && canTeam && team ? (
        <TeamPanel
          team={team}
          accounts={accounts.map((item) => ({
            id: item.id,
            username: item.username,
          }))}
        />
      ) : null}

      {tab === "instagram" || tab === "general" ? (
        <section className="rounded-3xl border border-white/10 bg-zinc-950/70 p-5">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-base font-semibold text-white">
                <Instagram className="h-4 w-4 text-pink-400" />
                Instagram Connection
              </h2>
              <p className="text-xs text-zinc-500">
                Manage your connected Instagram professional accounts.
              </p>
            </div>
            <div className="flex w-full min-w-0 flex-col gap-2 sm:w-auto sm:flex-row">
              <Button
                size="sm"
                variant="secondary"
                className="w-full sm:w-auto"
                asChild
              >
                <Link href="/dashboard/instagram">Open Instagram</Link>
              </Button>
              {canAddAccount ? (
                <Button size="sm" className="w-full sm:w-auto" asChild>
                  <Link href="/api/instagram/connect">+ Connect Instagram</Link>
                </Button>
              ) : (
                <Button
                  size="sm"
                  className="w-full sm:w-auto"
                  onClick={() => setTab("billing")}
                >
                  Upgrade plan
                </Button>
              )}
            </div>
          </div>
          {accounts.length > 0 ? (
            <>
              <ul className="space-y-3">
                {accounts.map((account) => (
                  <li
                    key={account.id}
                    className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/30 p-3 sm:flex-row sm:items-center"
                  >
                    {account.profilePictureUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={account.profilePictureUrl}
                        alt=""
                        className="h-12 w-12 rounded-full object-cover"
                      />
                    ) : (
                      <InstagramMark size={48} />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-white">
                        @{account.username}
                        <Badge
                          tone={
                            account.webhookStatus === "active" ||
                            account.webhookStatus === "mock"
                              ? "success"
                              : "warning"
                          }
                        >
                          {account.webhookStatus}
                        </Badge>
                      </p>
                      <p className="text-xs text-zinc-500">
                        Connected {formatWhen(account.connectedAt)} ·{" "}
                        {account.automations} automations
                      </p>
                    </div>
                    <DisconnectInstagramButton accountId={account.id} />
                  </li>
                ))}
              </ul>
              <div className="mt-4 grid gap-3 sm:grid-cols-4">
                {[
                  ["Posts & Reels", stats.media],
                  ["Total Comments", stats.comments],
                  ["Active Automations", stats.automations],
                  ["Messages Sent", stats.sent],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-2xl border border-white/10 bg-black/30 p-3"
                  >
                    <p className="text-xs text-zinc-500">{label}</p>
                    <p className="mt-1 text-xl font-semibold text-white">
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-zinc-400">
              No Instagram account connected.{" "}
              <Link href="/dashboard/instagram" className="text-violet-300">
                Connect Instagram
              </Link>
            </p>
          )}
        </section>
      ) : null}

      {admin && (tab === "webhooks" || tab === "general") ? (
        <section className="rounded-3xl border border-white/10 bg-zinc-950/70 p-5">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-base font-semibold text-white">
                <Link2 className="h-4 w-4 text-violet-300" />
                Webhook Status
              </h2>
              <p className="text-xs text-zinc-500">
                Used to receive real-time Instagram comment events.
              </p>
            </div>
            <Button size="sm" onClick={testWebhook} disabled={testing}>
              {testing ? "Testing…" : "Test Webhook"}
            </Button>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <div>
              <p className="text-xs text-zinc-500">Status</p>
              <div className="mt-1 flex flex-wrap gap-2">
                <Badge tone={webhookOk ? "success" : "warning"}>
                  {webhookOk ? "Connected" : "Not connected"}
                </Badge>
                <Badge tone={metaConfigured ? "success" : "warning"}>
                  {mock
                    ? "Mock mode"
                    : metaConfigured
                      ? "Meta API configured"
                      : "Meta API not configured"}
                </Badge>
              </div>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Webhook URL</p>
              <p className="mt-1 break-all font-mono text-xs text-zinc-200">
                {webhookUrl}
              </p>
              <button
                type="button"
                className="mt-1 inline-flex items-center gap-1 text-xs text-violet-300"
                onClick={() => copy(webhookUrl, "Webhook URL")}
              >
                <Copy className="h-3 w-3" /> Copy
              </button>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Verify Token</p>
              <p className="mt-1 text-sm text-white">
                {verifyTokenConfigured ? "••••••••••••" : "Not set"}
              </p>
              <p className="text-xs text-zinc-500">
                Stored in server env. Never shown here.
              </p>
            </div>
          </div>
        </section>
      ) : null}

      {tab === "notifications" || tab === "general" ? (
        <section className="rounded-3xl border border-white/10 bg-zinc-950/70 p-5">
          <h2 className="mb-1 flex items-center gap-2 text-base font-semibold text-white">
            <Bell className="h-4 w-4 text-violet-300" />
            Notification Preferences
          </h2>
          <p className="mb-4 text-xs text-zinc-500">
            These switches are local only. Email delivery is not wired yet.
          </p>
          <div className="grid gap-3 lg:grid-cols-3">
            <label className="flex items-center justify-between rounded-2xl border border-white/10 px-4 py-3">
              <span>
                <p className="text-sm text-white">Email notifications</p>
                <p className="text-xs text-zinc-500">
                  Preference only — emails are not sent yet.
                </p>
              </span>
              <Switch checked={emailOn} onCheckedChange={setEmailOn} />
            </label>
            <label className="flex items-center justify-between rounded-2xl border border-white/10 px-4 py-3">
              <span>
                <p className="text-sm text-white">Automation alerts</p>
                <p className="text-xs text-zinc-500">
                  Watch Activity for sent and failed replies.
                </p>
              </span>
              <Switch checked={alertsOn} onCheckedChange={setAlertsOn} />
            </label>
            <label className="flex items-center justify-between rounded-2xl border border-white/10 px-4 py-3">
              <span>
                <p className="text-sm text-white">Weekly digest</p>
                <p className="text-xs text-zinc-500">Not implemented.</p>
              </span>
              <Switch checked={digestOn} onCheckedChange={setDigestOn} />
            </label>
          </div>
        </section>
      ) : null}

      {admin && tab === "security" ? (
        <section className="rounded-3xl border border-white/10 bg-zinc-950/70 p-5">
          <h2 className="mb-1 flex items-center gap-2 text-base font-semibold text-white">
            <Shield className="h-4 w-4 text-violet-300" />
            Security
          </h2>
          <p className="text-sm text-zinc-400">
            Password changes are not in this build. Sign out from the header
            when you are done on a shared computer.
          </p>
        </section>
      ) : null}

      {admin && (tab === "danger" || tab === "general") ? (
        <section className="flex flex-col gap-4 rounded-3xl border border-red-500/30 bg-red-950/20 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-base font-semibold text-white">
              <Trash2 className="h-4 w-4 text-red-400" />
              Danger Zone
            </h2>
            <p className="mt-1 text-sm text-zinc-400">
              Permanently delete your account and all data.
            </p>
            <p className="mt-2 text-xs text-red-300">
              Account deletion is not enabled in this MVP.
            </p>
          </div>
          <Button variant="danger" disabled>
            Delete Account
          </Button>
        </section>
      ) : null}

      <Modal
        open={Boolean(cancelReceiptId)}
        onOpenChange={(open) => {
          if (!open) setCancelReceiptId(null);
        }}
      >
        <ModalContent title="Cancel this checkout?">
          <p className="text-sm leading-relaxed text-zinc-400">
            This pending Razorpay order will be marked cancelled. You will not
            be charged.
          </p>
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setCancelReceiptId(null)}
            >
              Keep it
            </Button>
            <Button
              size="sm"
              variant="danger"
              disabled={receiptBusy !== null}
              onClick={() => {
                const id = cancelReceiptId;
                setCancelReceiptId(null);
                if (id) void receiptAction(id, "cancel");
              }}
            >
              Yes, cancel
            </Button>
          </div>
        </ModalContent>
      </Modal>
    </div>
  );
}
