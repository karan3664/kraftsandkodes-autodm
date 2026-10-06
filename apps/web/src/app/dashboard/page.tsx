import { prisma } from "@kdl/db";
import { requireUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { getConnectedInstagramProfile } from "@/lib/instagram";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, BarChart3, MessageCircle, Send, Zap } from "lucide-react";
import { InstagramMark } from "@/components/brand/instagram-mark";
import Link from "next/link";
import { resolveWorkspaceInstagramAccount } from "@/lib/instagram-selection";
import {
  accountWhere,
  executionWhere,
  loadWorkspace,
} from "@/lib/team/workspace";
import { isAdmin } from "@/lib/auth/admin";
import {
  canConnectAccount,
  getEffectivePlan,
  monthWindow,
  planDisplayName,
  replyLimit,
  usageAlert,
} from "@/lib/plans";
import { ConnectInstagramButton } from "./instagram/actions";

function greeting(date: Date) {
  const hour = date.getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

function weekDelta(current: number, previous: number) {
  if (previous === 0) {
    return current === 0 ? "No prior week" : "New this week";
  }
  const pct = Math.round(((current - previous) / previous) * 100);
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct}% from last week`;
}

function initials(name?: string | null) {
  const handle = (name ?? "?").replace(/^@/, "");
  return handle.slice(0, 2).toUpperCase();
}

function formatCount(value?: number) {
  if (value == null) return null;
  return value.toLocaleString();
}

export default async function DashboardPage() {
  const user = await requireUser();
  if (!user) {
    redirect("/auth/login");
  }

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const dayMs = 24 * 60 * 60 * 1000;

  const ws = await loadWorkspace(user);
  const { selected } = await resolveWorkspaceInstagramAccount(ws);
  const accountFilter = selected
    ? { instagramAccountId: selected.id }
    : {
        userId: ws.ownerUserId,
        ...(ws.assignedAccountIds
          ? { instagramAccountId: { in: ws.assignedAccountIds } }
          : {}),
      };
  const { start, end } = monthWindow();

  const [accounts, automations, executions, recent, dbUser, sentThisMonth] =
    await Promise.all([
      prisma.instagramAccount.findMany({ where: accountWhere(ws) }),
      prisma.automation.findMany({
        where: accountFilter,
        include: { keywords: true, media: true },
      }),
      prisma.automationExecution.findMany({
        where: selected
          ? { instagramAccountId: selected.id }
          : executionWhere(ws),
      }),
      prisma.automationExecution.findMany({
        where: selected
          ? { instagramAccountId: selected.id }
          : executionWhere(ws),
        include: { automation: true },
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
      prisma.user.findUnique({
        where: { id: ws.ownerUserId },
        select: { plan: true, planExpiresAt: true },
      }),
      prisma.automationExecution.count({
        where: {
          status: "sent",
          createdAt: { gte: start, lt: end },
          instagramAccount: { userId: ws.ownerUserId },
        },
      }),
    ]);

  const connected = selected ?? accounts[0];
  const profile = connected
    ? await getConnectedInstagramProfile(connected.accessTokenEncrypted)
    : null;
  const followers = formatCount(profile?.followersCount);
  const following = formatCount(profile?.followsCount);
  const active = automations.filter((item) => item.enabled);
  const sent = executions.filter((item) => item.status === "sent");
  const thisWeek = executions.filter((item) => item.createdAt >= weekAgo);
  const lastWeek = executions.filter(
    (item) => item.createdAt >= twoWeeksAgo && item.createdAt < weekAgo,
  );
  const sentThisWeek = thisWeek.filter((item) => item.status === "sent").length;
  const sentLastWeek = lastWeek.filter((item) => item.status === "sent").length;
  const successRate =
    executions.length === 0
      ? 0
      : Math.round((sent.length / executions.length) * 100);

  const days = Array.from({ length: 7 }, (_, index) => {
    const start = new Date(now.getTime() - (6 - index) * dayMs);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start.getTime() + dayMs);
    const dayRows = executions.filter(
      (item) => item.createdAt >= start && item.createdAt < end,
    );
    return {
      label: start.toLocaleDateString(undefined, {
        day: "2-digit",
        month: "short",
      }),
      comments: dayRows.length,
      messages: dayRows.filter((item) => item.status === "sent").length,
    };
  });
  const maxBar = Math.max(
    1,
    ...days.flatMap((day) => [day.comments, day.messages]),
  );
  const firstName = user.name.split(" ")[0] ?? user.name;
  const featured = active[0] ?? automations[0];
  const admin = isAdmin(user);
  const plan = getEffectivePlan(dbUser ?? {});
  const monthlyCap = admin ? Number.POSITIVE_INFINITY : replyLimit(plan);
  const usagePct = admin
    ? 0
    : Math.min(
        100,
        Math.round((sentThisMonth / Math.max(monthlyCap, 1)) * 100),
      );
  const alert = usageAlert(sentThisMonth, plan, admin);
  const resetOn = end.toLocaleDateString("en-IN", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="min-w-0 space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-[radial-gradient(1200px_circle_at_90%_-10%,rgba(168,85,247,0.28),transparent_42%),linear-gradient(180deg,rgba(24,16,40,0.9),rgba(10,10,10,0.4))] px-4 py-5 sm:px-6 sm:py-7">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              {greeting(now)}, {firstName} 👋
            </h1>
            <p className="mt-2 max-w-xl text-sm text-zinc-400">
              Your Instagram comment-to-DM automations are working from this
              workspace.
            </p>
            {connected ? (
              <div className="mt-5 w-full rounded-2xl border border-white/10 bg-black/30 p-3">
                <div className="flex flex-wrap items-center gap-3">
                  {connected.profilePictureUrl ? (
                    // karan: remote IG avatars skip next/image until we pin CDN hosts
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={connected.profilePictureUrl}
                      alt=""
                      className="h-11 w-11 rounded-full object-cover"
                    />
                  ) : (
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-violet-600 text-sm font-semibold">
                      {initials(connected.username)}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 text-sm font-medium text-white">
                      @{connected.username}
                      <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    </p>
                    {profile?.name ? (
                      <p className="text-xs text-zinc-400">{profile.name}</p>
                    ) : null}
                    <p className="text-xs text-zinc-500">
                      {[
                        profile?.accountType,
                        `Connected ${connected.connectedAt.toLocaleDateString()}`,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    className="w-full sm:ml-auto sm:w-auto"
                    asChild
                  >
                    <Link href="/dashboard/instagram">Manage Instagram</Link>
                  </Button>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {[
                    ["Followers", followers ?? "—"],
                    ["Following", following ?? "—"],
                    ["Posts", formatCount(profile?.mediaCount) ?? "—"],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="rounded-xl bg-white/5 px-3 py-2 text-center"
                    >
                      <p className="text-sm font-semibold text-white">
                        {value}
                      </p>
                      <p className="text-[10px] uppercase tracking-wide text-zinc-500">
                        {label}
                      </p>
                    </div>
                  ))}
                </div>
                {profile?.biography ? (
                  <p className="mt-3 whitespace-pre-line text-xs text-zinc-400">
                    {profile.biography}
                  </p>
                ) : null}
                {profile?.website ? (
                  <a
                    href={profile.website}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-block text-xs text-violet-300 hover:underline"
                  >
                    {profile.website}
                  </a>
                ) : null}
              </div>
            ) : (
              <div className="mt-5">
                <ConnectInstagramButton
                  canAddAccount={
                    ws.canManageIg &&
                    canConnectAccount(accounts.length, plan, admin)
                  }
                  returnTo="/dashboard"
                />
              </div>
            )}
          </div>
          <div className="hidden shrink-0 items-center gap-3 pr-4 lg:flex">
            <InstagramMark
              size={80}
              className="rounded-3xl shadow-[0_0_40px_rgba(236,72,153,0.45)]"
            />
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-600 shadow-[0_0_32px_rgba(124,58,237,0.5)]">
              <MessageCircle className="h-8 w-8 text-white" />
            </div>
            <p className="max-w-[8rem] text-xs font-medium text-violet-200">
              Comments → Auto reply automatically
            </p>
          </div>
        </div>
      </section>

      <div className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Comments Processed",
            value: executions.length,
            hint: weekDelta(thisWeek.length, lastWeek.length),
            icon: MessageCircle,
          },
          {
            label: "Messages Sent",
            value: sent.length,
            hint: weekDelta(sentThisWeek, sentLastWeek),
            icon: Send,
          },
          {
            label: "Active Automations",
            value: active.length,
            hint: `${automations.length} total rules`,
            icon: Zap,
          },
          {
            label: "Success Rate",
            value: `${successRate}%`,
            hint: executions.length ? "Sent ÷ processed" : "No executions yet",
            icon: BarChart3,
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-3xl border border-white/10 bg-zinc-950/70 p-5"
          >
            <div className="flex items-start justify-between">
              <p className="text-sm text-zinc-400">{stat.label}</p>
              <stat.icon className="h-4 w-4 text-violet-300" />
            </div>
            <p className="mt-3 text-3xl font-semibold text-white">
              {stat.value}
            </p>
            <p className="mt-2 text-xs text-violet-300/80">{stat.hint}</p>
          </div>
        ))}
      </div>

      <section className="rounded-3xl border border-white/10 bg-zinc-950/70 p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-white">
              Monthly usage
            </h2>
            <p className="text-xs text-zinc-500">
              {planDisplayName(plan)} plan · Automated replies across all of
              your Instagram accounts
            </p>
          </div>
          <p className="text-sm text-zinc-300">
            {admin
              ? `${sentThisMonth.toLocaleString("en-IN")} / Unlimited automated replies`
              : `${sentThisMonth.toLocaleString("en-IN")} / ${monthlyCap.toLocaleString("en-IN")} automated replies`}
          </p>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className={`h-full rounded-full ${usagePct >= 100 ? "bg-rose-500" : usagePct >= 80 ? "bg-amber-400" : "bg-violet-500"}`}
            style={{ width: `${usagePct}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-zinc-500">
          {admin
            ? "Admin workspace — no plan caps"
            : `${usagePct}% used · Resets on ${resetOn}`}
        </p>
        {alert ? (
          <p
            className={`mt-2 text-sm ${alert.tone === "danger" ? "text-rose-300" : "text-amber-200"}`}
          >
            {alert.message}{" "}
            <Link href="/dashboard/settings?tab=billing" className="underline">
              {alert.cta}
            </Link>
          </p>
        ) : null}
      </section>

      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,0.9fr)]">
        <section className="min-w-0 overflow-hidden rounded-3xl border border-white/10 bg-zinc-950/70 p-4 sm:p-6">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-white">
                Recent Activity
              </h2>
              <p className="text-xs text-zinc-500">
                Incoming comments and private reply results
              </p>
            </div>
            <Link
              href="/dashboard/activity"
              className="shrink-0 text-xs text-violet-300 hover:text-white"
            >
              View All →
            </Link>
          </div>
          {recent.length === 0 ? (
            <p className="text-sm text-zinc-500">
              No activity yet. Create an automation and wait for a matching
              comment.
            </p>
          ) : (
            <ul className="divide-y divide-white/5">
              {recent.map((item) => (
                <li
                  key={item.id}
                  className="flex min-w-0 items-start gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-600/30 text-[11px] font-semibold text-violet-100">
                    {initials(item.commenterUsername)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-sm text-white">
                      {item.commenterUsername
                        ? `@${item.commenterUsername}`
                        : "Unknown"}{" "}
                      commented “{item.commentText}”
                    </p>
                    <p className="mt-0.5 break-words text-xs text-zinc-500">
                      {item.automation.name} · {item.createdAt.toLocaleString()}
                    </p>
                  </div>
                  <Badge
                    className="shrink-0"
                    tone={
                      item.status === "sent"
                        ? "success"
                        : item.status === "failed"
                          ? "danger"
                          : "neutral"
                    }
                  >
                    {item.status === "sent"
                      ? "Sent"
                      : item.status === "failed"
                        ? "Failed"
                        : item.status}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="min-w-0 space-y-6">
          <section className="min-w-0 overflow-hidden rounded-3xl border border-violet-500/20 bg-gradient-to-br from-violet-600/20 to-fuchsia-600/10 p-4 sm:p-6">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-violet-300">
              Create New Automation
            </p>
            <p className="mt-2 text-sm leading-relaxed text-zinc-300">
              Set up a keyword and send private replies automatically.
            </p>
            <Button className="mt-4 w-full sm:w-auto" asChild>
              <Link href="/dashboard/automations/new">+ Create Automation</Link>
            </Button>
          </section>

          <section className="min-w-0 overflow-hidden rounded-3xl border border-white/10 bg-zinc-950/70 p-4 sm:p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-white">
                Active Automations
              </h2>
              <Link
                href="/dashboard/automations"
                className="shrink-0 text-xs text-violet-300"
              >
                View All
              </Link>
            </div>
            {featured ? (
              <div className="min-w-0 space-y-3">
                {featured.media.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={featured.media.thumbnailUrl}
                    alt=""
                    className="h-28 w-full max-w-full rounded-2xl object-cover"
                  />
                ) : null}
                <p className="break-words text-sm font-medium text-white">
                  {featured.keywords.map((item) => item.keyword).join(" · ") ||
                    featured.name}
                </p>
                <p className="line-clamp-3 break-words text-xs leading-relaxed text-zinc-500">
                  {featured.media.mediaType} ·{" "}
                  {featured.media.caption || "Untitled"}
                </p>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Badge tone={featured.enabled ? "success" : "neutral"}>
                    {featured.enabled ? "Active" : "Paused"}
                  </Badge>
                  <Button size="sm" variant="secondary" asChild>
                    <Link href={`/dashboard/automations/${featured.id}`}>
                      Edit
                    </Link>
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-zinc-500">No automations yet.</p>
            )}
          </section>
        </div>
      </div>

      <section className="min-w-0 overflow-hidden rounded-3xl border border-white/10 bg-zinc-950/70 p-4 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-base font-semibold text-white">
            <Activity className="h-4 w-4 text-violet-300" />
            Quick Stats
          </h2>
          <p className="text-xs text-zinc-500">Last 7 days</p>
        </div>
        <div className="flex h-40 items-end gap-3">
          {days.map((day) => (
            <div
              key={day.label}
              className="flex flex-1 flex-col items-center gap-2"
            >
              <div className="flex h-28 w-full items-end justify-center gap-1">
                <span
                  className="w-2 rounded-full bg-violet-400/80"
                  style={{ height: `${(day.comments / maxBar) * 100}%` }}
                />
                <span
                  className="w-2 rounded-full bg-fuchsia-400/80"
                  style={{ height: `${(day.messages / maxBar) * 100}%` }}
                />
              </div>
              <span className="text-[10px] text-zinc-500">{day.label}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex gap-4 text-xs text-zinc-500">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-violet-400" /> Comments
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-fuchsia-400" /> Messages
          </span>
        </div>
      </section>
    </div>
  );
}
