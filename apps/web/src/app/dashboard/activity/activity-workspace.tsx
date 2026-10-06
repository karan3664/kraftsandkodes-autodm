"use client";

import { useMemo, useState } from "react";
import { Activity, Download, MessageCircle, Send, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { titleFromCaption } from "@/lib/title-from-caption";

export type ActivityRow = {
  id: string;
  commentText: string;
  commenterUsername: string | null;
  matchedKeyword: string;
  status: string;
  errorMessage: string | null;
  errorCode: string | null;
  messageText: string;
  createdAt: string;
  automationId: string;
  automationName: string;
  accountId: string;
  accountUsername: string;
  mediaCaption: string | null;
  mediaType: string;
  thumbnailUrl: string | null;
};

type Chip = "all" | "sent" | "failed" | "waiting";

function titleOf(caption: string | null) {
  return titleFromCaption(caption, 28);
}

function formatTime(value: string) {
  return new Date(value).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function initials(name?: string | null) {
  const handle = (name ?? "?").replace(/^@/, "");
  return handle.slice(0, 2).toUpperCase();
}

function isWaiting(status: string) {
  return (
    status === "pending" || status === "awaiting_follow" || status === "skipped"
  );
}

function weekDelta(current: number, previous: number) {
  if (previous === 0) {
    return current === 0 ? "No prior week" : "New this week";
  }
  const pct = Math.round(((current - previous) / previous) * 100);
  return `${pct > 0 ? "+" : ""}${pct}% from last week`;
}

function statusTone(
  status: string,
): "success" | "danger" | "warning" | "neutral" {
  if (status === "sent") return "success";
  if (status === "failed") return "danger";
  if (status === "awaiting_follow") return "warning";
  return "neutral";
}

function statusLabel(status: string) {
  if (status === "sent") return "Sent";
  if (status === "failed") return "Failed";
  if (status === "awaiting_follow") return "Awaiting follow";
  if (status === "skipped") return "Skipped";
  return status;
}

export function ActivityWorkspace({
  rows,
  automations,
  accounts,
  initialQuery,
}: {
  rows: ActivityRow[];
  automations: Array<{ id: string; name: string }>;
  accounts: Array<{ id: string; username: string }>;
  initialQuery: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [chip, setChip] = useState<Chip>("all");
  const [status, setStatus] = useState("all");
  const [automationId, setAutomationId] = useState("all");
  const [accountId, setAccountId] = useState("all");
  const [range, setRange] = useState<"7" | "30" | "all">("all");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [page, setPage] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);
  const pageSize = 10;

  const now = Date.now();
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  const twoWeeksAgo = now - 14 * 24 * 60 * 60 * 1000;

  const thisWeek = rows.filter(
    (row) => new Date(row.createdAt).getTime() >= weekAgo,
  );
  const lastWeek = rows.filter((row) => {
    const t = new Date(row.createdAt).getTime();
    return t >= twoWeeksAgo && t < weekAgo;
  });
  const sent = rows.filter((row) => row.status === "sent");
  const failed = rows.filter((row) => row.status === "failed");
  const waiting = rows.filter((row) => isWaiting(row.status));
  const success =
    rows.length === 0 ? 0 : Math.round((sent.length / rows.length) * 100);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const cutoff =
      range === "7"
        ? now - 7 * 24 * 60 * 60 * 1000
        : range === "30"
          ? now - 30 * 24 * 60 * 60 * 1000
          : 0;
    const next = rows.filter((row) => {
      if (cutoff && new Date(row.createdAt).getTime() < cutoff) return false;
      if (chip === "sent" && row.status !== "sent") return false;
      if (chip === "failed" && row.status !== "failed") return false;
      if (chip === "waiting" && !isWaiting(row.status)) return false;
      if (status !== "all" && row.status !== status) return false;
      if (automationId !== "all" && row.automationId !== automationId) {
        return false;
      }
      if (accountId !== "all" && row.accountId !== accountId) return false;
      if (
        needle &&
        !`${row.commentText} ${row.commenterUsername ?? ""} ${row.matchedKeyword} ${row.automationName}`
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
  }, [rows, query, chip, status, automationId, accountId, range, sort, now]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pages - 1);
  const slice = filtered.slice(
    safePage * pageSize,
    safePage * pageSize + pageSize,
  );
  const open = rows.find((row) => row.id === openId) ?? null;

  function reset() {
    setQuery("");
    setChip("all");
    setStatus("all");
    setAutomationId("all");
    setAccountId("all");
    setRange("all");
    setSort("newest");
    setPage(0);
  }

  function exportCsv() {
    const header = [
      "comment",
      "user",
      "keyword",
      "media",
      "automation",
      "status",
      "time",
      "error",
    ];
    const lines = [
      header.join(","),
      ...filtered.map((row) =>
        [
          row.commentText,
          row.commenterUsername ?? "",
          row.matchedKeyword,
          row.mediaCaption ?? "",
          row.automationName,
          row.status,
          row.createdAt,
          row.errorMessage ?? "",
        ]
          .map((value) => `"${value.replaceAll('"', '""')}"`)
          .join(","),
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "activity.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  const stats = [
    {
      label: "Total Comments",
      value: rows.length,
      hint: weekDelta(thisWeek.length, lastWeek.length),
      icon: MessageCircle,
      ring: "from-violet-500/40",
    },
    {
      label: "Messages Sent",
      value: sent.length,
      hint: weekDelta(
        thisWeek.filter((row) => row.status === "sent").length,
        lastWeek.filter((row) => row.status === "sent").length,
      ),
      icon: Send,
      ring: "from-sky-500/40",
    },
    {
      label: "Failed Replies",
      value: failed.length,
      hint: weekDelta(
        thisWeek.filter((row) => row.status === "failed").length,
        lastWeek.filter((row) => row.status === "failed").length,
      ),
      icon: XCircle,
      ring: "from-rose-500/40",
    },
    {
      label: "Success Rate",
      value: `${success}%`,
      hint: rows.length ? "Sent ÷ processed" : "No activity yet",
      icon: Activity,
      ring: "from-emerald-500/40",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 shadow-[0_0_28px_rgba(124,58,237,0.45)]">
            <Activity className="h-6 w-6 text-white" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold text-white">Activity</h1>
            <p className="text-sm text-zinc-400">
              Track Instagram comments, keyword matches, and private replies.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={range}
            onChange={(event) => {
              setRange(event.target.value as typeof range);
              setPage(0);
            }}
            className="select-pill h-10 rounded-full border border-white/10 bg-black/40 text-sm text-zinc-200"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="all">All time</option>
          </select>
          <Button variant="secondary" onClick={exportCsv}>
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
            <p className="mt-1 text-[11px] text-emerald-300/80">{stat.hint}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setPage(0);
          }}
          placeholder="Search comments, user, keyword..."
          className="h-10 w-full min-w-0 flex-1 rounded-full border border-white/10 bg-black/40 px-4 text-sm text-white outline-none sm:min-w-[180px]"
        />
        <select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(0);
          }}
          className="select-pill h-10 rounded-full border border-white/10 bg-black/40 text-sm text-zinc-200"
        >
          <option value="all">All Status</option>
          <option value="sent">Sent</option>
          <option value="failed">Failed</option>
          <option value="awaiting_follow">Awaiting follow</option>
          <option value="pending">Pending</option>
          <option value="skipped">Skipped</option>
        </select>
        <select
          value={automationId}
          onChange={(event) => {
            setAutomationId(event.target.value);
            setPage(0);
          }}
          className="select-pill h-10 rounded-full border border-white/10 bg-black/40 text-sm text-zinc-200"
        >
          <option value="all">All Automations</option>
          {automations.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <select
          value={accountId}
          onChange={(event) => {
            setAccountId(event.target.value);
            setPage(0);
          }}
          className="select-pill h-10 rounded-full border border-white/10 bg-black/40 text-sm text-zinc-200"
        >
          <option value="all">All Instagram Accounts</option>
          {accounts.map((item) => (
            <option key={item.id} value={item.id}>
              @{item.username}
            </option>
          ))}
        </select>
        <Button size="sm" variant="ghost" onClick={reset}>
          Reset
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            ["all", `All (${rows.length})`],
            ["sent", `Replied (${sent.length})`],
            ["failed", `Failed (${failed.length})`],
            ["waiting", `Waiting (${waiting.length})`],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => {
              setChip(value);
              setPage(0);
            }}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium",
              chip === value
                ? "bg-violet-600 text-white"
                : "border border-white/10 text-zinc-400",
            )}
          >
            {label}
          </button>
        ))}
        <select
          value={sort}
          onChange={(event) => setSort(event.target.value as typeof sort)}
          className="select-pill ml-auto h-9 rounded-full border border-white/10 bg-black/40 text-xs text-zinc-200"
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
        </select>
      </div>

      <div className="overflow-x-auto rounded-3xl border border-white/10">
        <table className="w-full min-w-[880px] text-left text-sm">
          <thead className="text-[11px] uppercase tracking-wide text-zinc-500">
            <tr className="border-b border-white/10">
              <th className="px-4 py-3 font-medium">Comment</th>
              <th className="px-4 py-3 font-medium">User</th>
              <th className="px-4 py-3 font-medium">Keyword</th>
              <th className="px-4 py-3 font-medium">Media</th>
              <th className="px-4 py-3 font-medium">Automation</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Time</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {slice.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-10 text-center text-zinc-500"
                >
                  No comment activity yet. Matching comments appear here.
                </td>
              </tr>
            ) : (
              slice.map((row) => (
                <tr key={row.id} className="border-b border-white/5">
                  <td className="max-w-[140px] truncate px-4 py-3 text-white">
                    {row.commentText}
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-600/30 text-[10px] font-semibold text-violet-100">
                        {initials(row.commenterUsername)}
                      </span>
                      <span className="text-zinc-200">
                        {row.commenterUsername
                          ? `@${row.commenterUsername}`
                          : "—"}
                      </span>
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-violet-600/20 px-2 py-0.5 text-[10px] font-semibold uppercase text-violet-200">
                      {row.matchedKeyword}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-2">
                      {row.thumbnailUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={row.thumbnailUrl}
                          alt=""
                          className="h-8 w-8 rounded-lg object-cover"
                        />
                      ) : (
                        <span className="h-8 w-8 rounded-lg bg-zinc-800" />
                      )}
                      <span className="max-w-[140px] truncate text-zinc-300">
                        {titleOf(row.mediaCaption)}
                      </span>
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-300">
                    {row.automationName}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={statusTone(row.status)}>
                      {statusLabel(row.status)}
                    </Badge>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-zinc-500">
                    {formatTime(row.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        setOpenId(openId === row.id ? null : row.id)
                      }
                    >
                      View
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {open ? (
        <div className="rounded-3xl border border-white/10 bg-zinc-950/70 p-5 text-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-semibold text-white">
              {open.commenterUsername
                ? `@${open.commenterUsername}`
                : "Comment"}
            </p>
            <button
              type="button"
              className="text-zinc-500 hover:text-white"
              onClick={() => setOpenId(null)}
            >
              Close
            </button>
          </div>
          <p className="text-zinc-300">“{open.commentText}”</p>
          <p className="mt-3 text-xs text-zinc-500">DM sent / attempted</p>
          <pre className="mt-1 whitespace-pre-wrap font-sans text-zinc-200">
            {open.messageText}
          </pre>
          {open.errorMessage ? (
            <p className="mt-3 text-sm text-red-300">
              {open.errorCode ? `${open.errorCode}: ` : ""}
              {open.errorMessage}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-500">
        <p>
          Showing {filtered.length === 0 ? 0 : safePage * pageSize + 1}–
          {Math.min(filtered.length, (safePage + 1) * pageSize)} of{" "}
          {filtered.length} results
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
          {Array.from({ length: Math.min(pages, 8) }, (_, index) => (
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
        <p>10 per page</p>
      </div>
    </div>
  );
}
