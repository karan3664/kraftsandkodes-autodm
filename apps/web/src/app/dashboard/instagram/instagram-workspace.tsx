"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Clapperboard,
  ImageIcon,
  MessageCircle,
  RefreshCw,
  Send,
  Users,
  Zap,
} from "lucide-react";
import { InstagramMark } from "@/components/brand/instagram-mark";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { titleFromCaption } from "@/lib/title-from-caption";
import { INSTAGRAM_ACCOUNT_LIMIT_MESSAGE } from "@/lib/plans";
import { ConnectInstagramButton, DisconnectInstagramButton } from "./actions";

export type InstagramPageMedia = {
  id: string;
  instagramMediaId: string;
  mediaType: string;
  caption: string | null;
  thumbnailUrl: string | null;
  permalink: string | null;
  publishedAt: string | null;
  syncedAt: string | null;
  likeCount: number | null;
  commentsCount: number | null;
  commentsEnabled: boolean | null;
};

export type InstagramPageAutomation = {
  id: string;
  name: string;
  enabled: boolean;
  mediaId: string;
  keywords: string[];
  privateReplyMessage: string;
};

export type InstagramPageComment = {
  id: string;
  commentText: string;
  commenterUsername: string | null;
  matchedKeyword: string;
  status: string;
  createdAt: string;
  mediaId: string;
  automationName: string;
  mediaCaption: string | null;
  mediaType: string;
  thumbnailUrl: string | null;
};

type Filter = "all" | "reels" | "posts" | "with" | "without";

function isReel(type: string) {
  return type.toUpperCase().includes("REEL") || type.toUpperCase() === "VIDEO";
}

function mediaStats(item: {
  likeCount: number | null;
  commentsCount: number | null;
  commentsEnabled: boolean | null;
}) {
  const parts: string[] = [];
  if (item.likeCount != null) {
    parts.push(`${item.likeCount.toLocaleString()} likes`);
  }
  if (item.commentsCount != null) {
    parts.push(`${item.commentsCount.toLocaleString()} comments`);
  }
  if (item.commentsEnabled === false) {
    parts.push("comments off");
  }
  return parts.join(" · ");
}

function AccountLimitBanner() {
  return (
    <div className="rounded-2xl border border-amber-400/30 bg-amber-950/20 px-4 py-3 text-sm text-amber-100">
      {INSTAGRAM_ACCOUNT_LIMIT_MESSAGE}{" "}
      <a
        href="/dashboard/settings?tab=billing"
        className="font-medium underline"
      >
        Upgrade plan
      </a>
    </div>
  );
}

export function InstagramWorkspace({
  account,
  media: initialMedia,
  automations,
  comments,
  oauthError,
  oauthPending = false,
  accountLimit,
  canAddAccount,
  canConnect,
  mock,
  configured,
}: {
  account: {
    id: string;
    username: string;
    instagramUserId: string;
    profilePictureUrl: string | null;
    connectedAt: string;
    webhookStatus: string;
    webhookError: string | null;
    followersCount: number | null;
    followsCount: number | null;
    mediaCount: number | null;
    name: string | null;
    accountType: string | null;
    biography: string | null;
    website: string | null;
  } | null;
  media: InstagramPageMedia[];
  automations: InstagramPageAutomation[];
  comments: InstagramPageComment[];
  oauthError: string | null;
  oauthPending?: boolean;
  accountLimit: boolean;
  canAddAccount: boolean;
  canConnect: boolean;
  mock: boolean;
  configured: boolean;
}) {
  const [media, setMedia] = useState(initialMedia);
  const [tab, setTab] = useState<"overview" | "posts" | "comments">("posts");
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [commentQuery, setCommentQuery] = useState("");
  const [page, setPage] = useState(0);
  const [selectedId, setSelectedId] = useState(initialMedia[0]?.id ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(oauthError);
  const pageSize = 20;

  const autoByMedia = useMemo(() => {
    const map = new Map<string, InstagramPageAutomation[]>();
    for (const item of automations) {
      const list = map.get(item.mediaId) ?? [];
      list.push(item);
      map.set(item.mediaId, list);
    }
    return map;
  }, [automations]);

  const lastSynced = media.reduce<string | null>((latest, item) => {
    if (!item.syncedAt) return latest;
    if (!latest || item.syncedAt > latest) return item.syncedAt;
    return latest;
  }, null);

  const filtered = useMemo(() => {
    return media.filter((item) => {
      const autos = autoByMedia.get(item.id) ?? [];
      if (filter === "reels" && !isReel(item.mediaType)) return false;
      if (filter === "posts" && isReel(item.mediaType)) return false;
      if (filter === "with" && autos.length === 0) return false;
      if (filter === "without" && autos.length > 0) return false;
      if (
        query &&
        !`${item.caption ?? ""} ${item.instagramMediaId}`
          .toLowerCase()
          .includes(query.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [media, filter, query, autoByMedia]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const slice = filtered.slice(page * pageSize, page * pageSize + pageSize);
  const selected = media.find((item) => item.id === selectedId) ?? slice[0];
  const selectedAutos = selected ? (autoByMedia.get(selected.id) ?? []) : [];
  const selectedComments = comments.filter(
    (item) => item.mediaId === selected?.id,
  );
  const sent = comments.filter((item) => item.status === "sent").length;

  const visibleComments = comments.filter((item) => {
    if (!commentQuery) return true;
    const hay =
      `${item.commenterUsername ?? ""} ${item.commentText}`.toLowerCase();
    return hay.includes(commentQuery.toLowerCase());
  });

  async function refresh() {
    if (!account) return;
    setLoading(true);
    setError(null);
    const response = await fetch(
      `/api/instagram/media?instagramAccountId=${account.id}`,
    );
    const body = (await response.json()) as {
      success: boolean;
      data?: { media: InstagramPageMedia[] };
      error?: { message: string };
    };
    setLoading(false);
    if (!body.success || !body.data) {
      setError(body.error?.message ?? "Instagram media could not be loaded.");
      return;
    }
    setMedia(body.data.media);
    setPage(0);
  }

  if (!account) {
    return (
      <div className="rounded-3xl border border-white/10 bg-zinc-950/70 p-8">
        <div className="flex items-center gap-3">
          <InstagramMark size={48} />
          <div>
            <h1 className="text-2xl font-semibold text-white">Instagram</h1>
            <p className="text-sm text-zinc-400">
              Connect a Creator or Business Instagram account. Log in if asked,
              then tap Allow — login alone does not finish the connection.
            </p>
          </div>
        </div>
        {accountLimit ? (
          <div className="mt-4">
            <AccountLimitBanner />
          </div>
        ) : null}
        {oauthPending ? (
          <div className="mt-4 rounded-2xl border border-violet-400/30 bg-violet-950/30 px-4 py-3 text-sm text-violet-100">
            You already opened Instagram. Finish by tapping{" "}
            <span className="font-medium text-white">Allow</span> on the next
            screen (after login / save-info prompts).
          </div>
        ) : null}
        {error ? <p className="mt-4 text-sm text-amber-300">{error}</p> : null}
        {!configured && !mock ? (
          <p className="mt-4 text-sm text-amber-300">
            Add META_APP_ID, META_APP_SECRET, and META_REDIRECT_URI first.
          </p>
        ) : null}
        <div className="mt-6">
          <ConnectInstagramButton
            disabled={!canConnect}
            canAddAccount={canAddAccount}
            resume={oauthPending || Boolean(error)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <InstagramMark size={48} />
          <div>
            <h1 className="text-2xl font-semibold text-white">Instagram</h1>
            <p className="text-sm text-zinc-400">
              Manage the connected account, posts, reels, and comment activity.
            </p>
          </div>
        </div>
        <Button variant="secondary" onClick={refresh} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Refreshing" : "Refresh"}
        </Button>
      </div>

      <section className="rounded-3xl border border-white/10 bg-zinc-950/70 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          {account.profilePictureUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={account.profilePictureUrl}
              alt=""
              className="h-16 w-16 rounded-full object-cover"
            />
          ) : (
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-violet-600 text-xl font-semibold">
              {account.username.slice(0, 1).toUpperCase()}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-center gap-2 text-lg font-semibold text-white">
              @{account.username}
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <Badge tone="success">Connected</Badge>
              {account.accountType ? (
                <Badge tone="neutral">{account.accountType}</Badge>
              ) : null}
            </p>
            {account.name ? (
              <p className="text-sm text-zinc-300">{account.name}</p>
            ) : (
              <p className="text-xs text-zinc-500">Professional account</p>
            )}
            {account.followersCount != null && account.followsCount != null ? (
              <p className="mt-1 text-sm text-zinc-300">
                {account.followersCount.toLocaleString()} followers ·{" "}
                {account.followsCount.toLocaleString()} following
                {account.mediaCount != null
                  ? ` · ${account.mediaCount.toLocaleString()} posts`
                  : ""}
              </p>
            ) : null}
            {account.biography ? (
              <p className="mt-2 max-w-xl whitespace-pre-line text-xs text-zinc-400">
                {account.biography}
              </p>
            ) : null}
            {account.website ? (
              <a
                href={account.website}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-block text-xs text-violet-300 hover:underline"
              >
                {account.website}
              </a>
            ) : null}
          </div>
          <dl className="grid grid-cols-2 gap-x-8 gap-y-1 text-xs text-zinc-400 sm:grid-cols-3">
            <div>
              <dt>Instagram User ID</dt>
              <dd className="font-mono text-white">
                {account.instagramUserId}
              </dd>
            </div>
            <div>
              <dt>Connected on</dt>
              <dd className="text-white">
                {new Date(account.connectedAt).toLocaleString()}
              </dd>
            </div>
            <div>
              <dt>Last synced</dt>
              <dd className="text-white">
                {lastSynced ? new Date(lastSynced).toLocaleString() : "Not yet"}
              </dd>
            </div>
          </dl>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={refresh} disabled={loading}>
              Refresh Media
            </Button>
            <ConnectInstagramButton canAddAccount={canAddAccount} />
            <DisconnectInstagramButton accountId={account.id} />
          </div>
        </div>
        {account.webhookError ? (
          <p className="mt-3 text-sm text-amber-300">{account.webhookError}</p>
        ) : (
          <p className="mt-3 text-xs text-zinc-500">
            Webhook: {account.webhookStatus}
          </p>
        )}
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Followers",
            value: account.followersCount?.toLocaleString() ?? "—",
            icon: Users,
            tone: "from-pink-600/30",
          },
          {
            label: "Following",
            value: account.followsCount?.toLocaleString() ?? "—",
            icon: Users,
            tone: "from-fuchsia-600/30",
          },
          {
            label: "Posts & Reels",
            value: account.mediaCount ?? media.length,
            icon: Clapperboard,
            tone: "from-violet-600/30",
          },
          {
            label: "Comments",
            value: comments.length,
            icon: MessageCircle,
            tone: "from-blue-600/30",
          },
          {
            label: "Active Automations",
            value: automations.filter((item) => item.enabled).length,
            icon: Zap,
            tone: "from-orange-600/30",
          },
          {
            label: "Messages Sent",
            value: sent,
            icon: Send,
            tone: "from-emerald-600/30",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className={`rounded-3xl border border-white/10 bg-gradient-to-br ${stat.tone} to-zinc-950 p-5`}
          >
            <div className="flex items-center justify-between text-sm text-zinc-300">
              {stat.label}
              <stat.icon className="h-4 w-4" />
            </div>
            <p className="mt-3 text-3xl font-semibold text-white">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <div className="flex gap-2 border-b border-white/10 pb-2 text-sm">
        {(
          [
            ["overview", "Overview"],
            ["posts", "Posts & Reels"],
            ["comments", "Comments"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-full px-4 py-1.5 ${
              tab === id
                ? "bg-violet-600 text-white"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {accountLimit ? <AccountLimitBanner /> : null}
      {error ? <ErrorState message={error} /> : null}

      {tab === "overview" || tab === "posts" ? (
        <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,320px)]">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(0);
                }}
                placeholder="Search posts or reels…"
                className="h-10 min-w-0 flex-1 rounded-full border border-white/10 bg-white/5 px-4 text-sm outline-none sm:min-w-[180px]"
              />
              {(
                [
                  ["all", `All (${media.length})`],
                  [
                    "reels",
                    `Reels (${media.filter((item) => isReel(item.mediaType)).length})`,
                  ],
                  [
                    "posts",
                    `Posts (${media.filter((item) => !isReel(item.mediaType)).length})`,
                  ],
                  ["with", "With automation"],
                  ["without", "Without automation"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setFilter(id);
                    setPage(0);
                  }}
                  className={`rounded-full px-3 py-1 text-xs ${
                    filter === id
                      ? "bg-violet-600 text-white"
                      : "border border-white/10 text-zinc-400"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {slice.map((item) => {
                const autos = autoByMedia.get(item.id) ?? [];
                const commentCount = comments.filter(
                  (row) => row.mediaId === item.id,
                ).length;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedId(item.id)}
                    className={`overflow-hidden rounded-3xl border text-left ${
                      selected?.id === item.id
                        ? "border-violet-500"
                        : "border-white/10"
                    } bg-zinc-950/80`}
                  >
                    <div className="relative h-40 bg-zinc-900">
                      {item.thumbnailUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.thumbnailUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="flex h-full items-center justify-center text-zinc-600">
                          <ImageIcon className="h-8 w-8" />
                        </span>
                      )}
                      <span className="absolute left-3 top-3 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-semibold uppercase">
                        {isReel(item.mediaType) ? "Reel" : "Post"}
                      </span>
                    </div>
                    <div className="space-y-2 p-4">
                      <p className="line-clamp-2 text-sm font-medium text-white">
                        {titleFromCaption(item.caption)}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {item.mediaType}
                        {item.publishedAt
                          ? ` · ${new Date(item.publishedAt).toLocaleString()}`
                          : ""}
                      </p>
                      {mediaStats(item) ? (
                        <p className="text-xs text-zinc-400">
                          {mediaStats(item)}
                        </p>
                      ) : null}
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-zinc-400">
                          {item.permalink ? (
                            <a
                              href={item.permalink}
                              target="_blank"
                              rel="noreferrer"
                              className="text-violet-300 hover:underline"
                              onClick={(event) => event.stopPropagation()}
                            >
                              Open on Instagram
                            </a>
                          ) : (
                            `${commentCount} matched`
                          )}
                        </span>
                        <Badge tone={autos.length ? "success" : "neutral"}>
                          {autos.length ? "Automation Active" : "No Automation"}
                        </Badge>
                      </div>
                      <div className="flex gap-2">
                        {autos[0] ? (
                          <Link
                            href={`/dashboard/automations/${autos[0].id}`}
                            className="rounded-full border border-white/10 px-3 py-1 text-xs text-white"
                            onClick={(event) => event.stopPropagation()}
                          >
                            Manage
                          </Link>
                        ) : (
                          <Link
                            href="/dashboard/automations/new"
                            className="rounded-full bg-violet-600 px-3 py-1 text-xs text-white"
                            onClick={(event) => event.stopPropagation()}
                          >
                            Create Automation
                          </Link>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            {filtered.length === 0 ? (
              <p className="text-sm text-zinc-500">
                No posts match this filter. Refresh media if the grid is empty.
              </p>
            ) : null}
            <div className="flex items-center justify-between text-xs text-zinc-500">
              <p>
                Showing {slice.length} of {filtered.length}
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={page === 0}
                  onClick={() => setPage((value) => value - 1)}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={page + 1 >= pages}
                  onClick={() => setPage((value) => value + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>

          <aside className="space-y-4">
            {selected ? (
              <div className="rounded-3xl border border-white/10 bg-zinc-950/80 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">
                  Reel Details
                </p>
                {selected.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={selected.thumbnailUrl}
                    alt=""
                    className="mt-3 h-36 w-full rounded-2xl object-cover"
                  />
                ) : null}
                <p className="mt-3 text-sm font-semibold text-white">
                  {titleFromCaption(selected.caption)}
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  {selected.mediaType}
                  {selected.publishedAt
                    ? ` · ${new Date(selected.publishedAt).toLocaleString()}`
                    : ""}
                </p>
                {mediaStats(selected) ? (
                  <p className="mt-1 text-xs text-zinc-300">
                    {mediaStats(selected)}
                  </p>
                ) : null}
                {selected.permalink ? (
                  <a
                    href={selected.permalink}
                    className="mt-2 block truncate text-xs text-violet-300"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {selected.permalink}
                  </a>
                ) : null}
                <p className="mt-2 font-mono text-[11px] text-zinc-500">
                  {selected.instagramMediaId}
                </p>
                <div className="mt-4 rounded-2xl border border-white/10 p-3">
                  {selectedAutos[0] ? (
                    <>
                      <div className="flex items-center justify-between">
                        <Badge tone="success">Automation Active</Badge>
                        <Link
                          href={`/dashboard/automations/${selectedAutos[0].id}`}
                          className="text-xs text-violet-300"
                        >
                          Edit
                        </Link>
                      </div>
                      <p className="mt-2 text-sm text-white">
                        {selectedAutos[0].keywords.join(" · ")}
                      </p>
                      <p className="mt-1 line-clamp-3 text-xs text-zinc-500">
                        {selectedAutos[0].privateReplyMessage}
                      </p>
                    </>
                  ) : (
                    <Link
                      href="/dashboard/automations/new"
                      className="text-sm text-violet-300"
                    >
                      Create automation for this post
                    </Link>
                  )}
                </div>
                <div className="mt-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">
                    Recent comments
                  </p>
                  <ul className="mt-2 space-y-2">
                    {selectedComments.slice(0, 6).map((item) => (
                      <li
                        key={item.id}
                        className="flex items-center justify-between text-xs"
                      >
                        <span className="truncate text-zinc-300">
                          {item.commenterUsername
                            ? `@${item.commenterUsername}`
                            : "Unknown"}{" "}
                          · {item.commentText}
                        </span>
                        <Badge
                          tone={
                            item.status === "sent"
                              ? "success"
                              : item.status === "failed"
                                ? "danger"
                                : "neutral"
                          }
                        >
                          {item.status}
                        </Badge>
                      </li>
                    ))}
                    {selectedComments.length === 0 ? (
                      <li className="text-xs text-zinc-500">
                        No processed comments on this post yet.
                      </li>
                    ) : null}
                  </ul>
                </div>
              </div>
            ) : null}
          </aside>
        </div>
      ) : null}

      {tab === "overview" || tab === "comments" ? (
        <section className="rounded-3xl border border-white/10 bg-zinc-950/70 p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-white">Comments</h2>
              <p className="text-xs text-zinc-500">
                Comments processed here — not every public Instagram comment.
              </p>
            </div>
            <input
              value={commentQuery}
              onChange={(event) => setCommentQuery(event.target.value)}
              placeholder="Search username or comment…"
              className="h-9 w-64 rounded-full border border-white/10 bg-white/5 px-4 text-sm outline-none"
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="text-xs text-zinc-500">
                <tr>
                  <th className="pb-3 font-medium">User</th>
                  <th className="pb-3 font-medium">Comment</th>
                  <th className="pb-3 font-medium">Post / Reel</th>
                  <th className="pb-3 font-medium">Keyword</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {visibleComments.slice(0, 40).map((item) => (
                  <tr key={item.id} className="border-t border-white/5">
                    <td className="py-3 text-white">
                      {item.commenterUsername
                        ? `@${item.commenterUsername}`
                        : "—"}
                    </td>
                    <td className="max-w-[180px] truncate py-3 text-zinc-300">
                      {item.commentText}
                    </td>
                    <td className="max-w-[180px] truncate py-3 text-zinc-400">
                      {item.mediaType} · {titleFromCaption(item.mediaCaption)}
                    </td>
                    <td className="py-3 font-mono text-violet-300">
                      {item.matchedKeyword}
                    </td>
                    <td className="py-3">
                      <Badge
                        tone={
                          item.status === "sent"
                            ? "success"
                            : item.status === "failed"
                              ? "danger"
                              : "neutral"
                        }
                      >
                        {item.status}
                      </Badge>
                    </td>
                    <td className="py-3 text-xs text-zinc-500">
                      {new Date(item.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}
