"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  LayoutGrid,
  List,
  MessageCircle,
  Pause,
  Send,
  Settings2,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { titleFromCaption } from "@/lib/title-from-caption";
import { AutomationToggles } from "./toggles";

export type AutomationCard = {
  id: string;
  name: string;
  enabled: boolean;
  keywords: string[];
  privateReplyMessage: string;
  createdAt: string;
  accountId: string;
  accountUsername: string;
  mediaType: string;
  caption: string | null;
  thumbnailUrl: string | null;
  publishedAt: string | null;
  comments: number;
  sent: number;
};

function isReel(type: string) {
  return type.toUpperCase().includes("REEL") || type.toUpperCase() === "VIDEO";
}

function formatDate(value: string | null) {
  if (!value) return "";
  return new Date(value).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function AutomationsWorkspace({
  items,
  accounts,
}: {
  items: AutomationCard[];
  accounts: Array<{ id: string; username: string }>;
}) {
  const [query, setQuery] = useState("");
  const [accountId, setAccountId] = useState("all");
  const [status, setStatus] = useState<"all" | "active" | "paused">("all");
  const [type, setType] = useState<"all" | "reel" | "post">("all");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [grid, setGrid] = useState(true);
  const [page, setPage] = useState(0);
  const pageSize = 6;

  const active = items.filter((item) => item.enabled).length;
  const paused = items.length - active;
  const sent = items.reduce((sum, item) => sum + item.sent, 0);
  const comments = items.reduce((sum, item) => sum + item.comments, 0);
  const success = comments === 0 ? 0 : Math.round((sent / comments) * 100);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const next = items.filter((item) => {
      if (accountId !== "all" && item.accountId !== accountId) return false;
      if (status === "active" && !item.enabled) return false;
      if (status === "paused" && item.enabled) return false;
      if (type === "reel" && !isReel(item.mediaType)) return false;
      if (type === "post" && isReel(item.mediaType)) return false;
      if (
        needle &&
        !`${item.caption ?? ""} ${item.name} ${item.keywords.join(" ")}`
          .toLowerCase()
          .includes(needle)
      ) {
        return false;
      }
      return true;
    });
    next.sort((a, b) =>
      sort === "newest"
        ? b.createdAt.localeCompare(a.createdAt)
        : a.createdAt.localeCompare(b.createdAt),
    );
    return next;
  }, [items, accountId, status, type, query, sort]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pages - 1);
  const slice = filtered.slice(
    safePage * pageSize,
    safePage * pageSize + pageSize,
  );

  const stats = [
    {
      label: "Total Automations",
      value: items.length,
      hint: "In this workspace",
      icon: Zap,
      ring: "from-violet-500/40",
    },
    {
      label: "Active",
      value: active,
      hint: items.length
        ? `${Math.round((active / items.length) * 100)}% of total`
        : "None yet",
      icon: Zap,
      ring: "from-emerald-500/40",
    },
    {
      label: "Paused",
      value: paused,
      hint: items.length
        ? `${Math.round((paused / items.length) * 100)}% of total`
        : "None yet",
      icon: Pause,
      ring: "from-amber-500/40",
    },
    {
      label: "Total Replies Sent",
      value: sent,
      hint: `${comments} comments processed`,
      icon: Send,
      ring: "from-sky-500/40",
    },
    {
      label: "Success Rate",
      value: `${success}%`,
      hint: comments ? "Sent ÷ processed" : "No executions yet",
      icon: MessageCircle,
      ring: "from-fuchsia-500/40",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 shadow-[0_0_28px_rgba(124,58,237,0.45)]">
              <Settings2 className="h-6 w-6 text-white" />
            </span>
            <div>
              <h1 className="text-2xl font-semibold text-white">Automations</h1>
              <p className="text-sm text-zinc-400">
                Set up keyword-based private replies for your Instagram posts
                and reels.
              </p>
            </div>
          </div>
          <Button asChild>
            <Link href="/dashboard/automations/new">+ Create Automation</Link>
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className={cn(
                "rounded-3xl border border-white/10 bg-gradient-to-br to-transparent p-4",
                stat.ring,
              )}
            >
              <div className="flex items-start justify-between">
                <p className="text-xs text-zinc-400">{stat.label}</p>
                <stat.icon className="h-4 w-4 text-violet-300" />
              </div>
              <p className="mt-3 text-3xl font-semibold text-white">
                {stat.value}
              </p>
              <p className="mt-1 text-[11px] text-emerald-300/80">
                {stat.hint}
              </p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(0);
            }}
            placeholder="Search posts or automations..."
            className="h-10 min-w-0 flex-1 rounded-full border border-white/10 bg-black/40 px-4 text-sm text-white outline-none placeholder:text-zinc-500 sm:min-w-[180px]"
          />
          <select
            value={accountId}
            onChange={(event) => {
              setAccountId(event.target.value);
              setPage(0);
            }}
            className="select-pill h-10 rounded-full border border-white/10 bg-black/40 text-sm text-zinc-200"
          >
            <option value="all">All Accounts</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                @{account.username}
              </option>
            ))}
          </select>
          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as typeof status);
              setPage(0);
            }}
            className="select-pill h-10 rounded-full border border-white/10 bg-black/40 text-sm text-zinc-200"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
          </select>
          <select
            value={type}
            onChange={(event) => {
              setType(event.target.value as typeof type);
              setPage(0);
            }}
            className="select-pill h-10 rounded-full border border-white/10 bg-black/40 text-sm text-zinc-200"
          >
            <option value="all">All Types</option>
            <option value="reel">Reels</option>
            <option value="post">Posts</option>
          </select>
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as typeof sort)}
            className="select-pill h-10 rounded-full border border-white/10 bg-black/40 text-sm text-zinc-200"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
          </select>
          <div className="ml-auto flex rounded-full border border-white/10 p-1">
            <button
              type="button"
              onClick={() => setGrid(true)}
              className={cn(
                "rounded-full p-2",
                grid ? "bg-violet-600 text-white" : "text-zinc-500",
              )}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setGrid(false)}
              className={cn(
                "rounded-full p-2",
                !grid ? "bg-violet-600 text-white" : "text-zinc-500",
              )}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>

        {slice.length === 0 ? (
          <p className="rounded-3xl border border-white/10 bg-zinc-950/60 p-8 text-sm text-zinc-400">
            No automations match these filters. Create one to get started.
          </p>
        ) : (
          <div
            className={cn(
              "grid gap-4",
              grid ? "md:grid-cols-2 xl:grid-cols-3" : "grid-cols-1",
            )}
          >
            {slice.map((item) => (
              <article
                key={item.id}
                className="overflow-hidden rounded-3xl border border-white/10 bg-zinc-950/70"
              >
                <div className="relative h-36 bg-zinc-900">
                  {item.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.thumbnailUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                  <span className="absolute left-3 top-3 rounded-full bg-black/70 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
                    {isReel(item.mediaType) ? "Reel" : "Post"}
                  </span>
                  <span
                    className={cn(
                      "absolute right-3 top-3 rounded-full px-2 py-1 text-[10px] font-semibold",
                      item.enabled
                        ? "bg-emerald-500/20 text-emerald-300"
                        : "bg-zinc-800 text-zinc-300",
                    )}
                  >
                    {item.enabled ? "Active" : "Paused"}
                  </span>
                </div>
                <div className="space-y-3 p-4">
                  <div>
                    <h2 className="line-clamp-1 text-sm font-semibold text-white">
                      {titleFromCaption(item.caption, 42, item.name)}
                    </h2>
                    <p className="text-[11px] text-zinc-500">
                      {formatDate(item.publishedAt ?? item.createdAt)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {item.keywords.slice(0, 3).map((keyword) => (
                      <span
                        key={keyword}
                        className="rounded-full bg-violet-600/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-200"
                      >
                        {keyword}
                      </span>
                    ))}
                    {item.keywords.length > 3 ? (
                      <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-zinc-400">
                        +{item.keywords.length - 3}
                      </span>
                    ) : null}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-zinc-400">
                    <span>{item.comments} Comments</span>
                    <span>{item.sent} Replied</span>
                    <span>
                      {item.comments === 0
                        ? "—"
                        : `${Math.round((item.sent / item.comments) * 100)}% Success`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <Button size="sm" variant="secondary" asChild>
                      <Link href={`/dashboard/automations/${item.id}`}>
                        Edit
                      </Link>
                    </Button>
                    <Button size="sm" variant="ghost" asChild>
                      <Link href="/dashboard/activity">View Activity</Link>
                    </Button>
                    <AutomationToggles
                      compact
                      id={item.id}
                      enabled={item.enabled}
                    />
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-zinc-500">
          <p>
            Showing {filtered.length === 0 ? 0 : safePage * pageSize + 1}–
            {Math.min(filtered.length, (safePage + 1) * pageSize)} of{" "}
            {filtered.length} automations
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="rounded-full px-3 py-1 hover:bg-white/5 disabled:opacity-40"
              disabled={safePage === 0}
              onClick={() => setPage(safePage - 1)}
            >
              Previous
            </button>
            {Array.from({ length: pages }, (_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => setPage(index)}
                className={cn(
                  "h-7 w-7 rounded-full",
                  index === safePage
                    ? "bg-violet-600 text-white"
                    : "hover:bg-white/5",
                )}
              >
                {index + 1}
              </button>
            ))}
            <button
              type="button"
              className="rounded-full px-3 py-1 hover:bg-white/5 disabled:opacity-40"
              disabled={safePage >= pages - 1}
              onClick={() => setPage(safePage + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
