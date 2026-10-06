"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Pencil, Plus } from "lucide-react";
import { InstagramMark } from "@/components/brand/instagram-mark";
import { DEFAULT_MESSAGES } from "@kdl/shared";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { titleFromCaption } from "@/lib/title-from-caption";

type MediaItem = {
  id: string;
  instagramMediaId: string;
  mediaType: string;
  caption: string | null;
  thumbnailUrl: string | null;
  permalink: string | null;
  publishedAt: string | null;
  likeCount?: number | null;
  commentsCount?: number | null;
  commentsEnabled?: boolean | null;
};

const STEPS = [
  "Select Content",
  "Keywords",
  "Reply Message",
  "Review & Create",
] as const;

const SUGGESTED_KEYWORDS = ["PRICE", "LINK", "SHOP", "INFO", "TRAIN"];

function isReel(type: string) {
  return type.toUpperCase().includes("REEL") || type.toUpperCase() === "VIDEO";
}

function titleOf(caption: string | null) {
  return titleFromCaption(caption, 48);
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

function mediaStats(item: MediaItem) {
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

export function CreateAutomationWizard({
  accounts,
  selectedAccountId,
}: {
  accounts: Array<{ id: string; username: string }>;
  selectedAccountId?: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [accountId, setAccountId] = useState(
    selectedAccountId && accounts.some((item) => item.id === selectedAccountId)
      ? selectedAccountId
      : (accounts[0]?.id ?? ""),
  );
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [type, setType] = useState<"all" | "reel" | "post">("all");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [mediaId, setMediaId] = useState("");
  const [keywords, setKeywords] = useState(["TRAIN", "TRAIN LINK", "LINK"]);
  const [draft, setDraft] = useState("");
  const [matchType, setMatchType] = useState<
    "contains" | "exact" | "all_comments"
  >("contains");
  const [message, setMessage] = useState<string>(DEFAULT_MESSAGES.link);
  const [requireFollow, setRequireFollow] = useState(true);
  const [commentOnly, setCommentOnly] = useState(false);
  const [ignoreOwnComments, setIgnoreOwnComments] = useState(true);
  const [followPrompt, setFollowPrompt] = useState<string>(
    DEFAULT_MESSAGES.followPrompt,
  );
  const [notFollowing, setNotFollowing] = useState<string>(
    DEFAULT_MESSAGES.notFollowing,
  );
  const [commentReply, setCommentReply] = useState<string>(
    DEFAULT_MESSAGES.commentReply,
  );
  const [enabled, setEnabled] = useState(true);
  const [saving, setSaving] = useState(false);

  const selected = media.find((item) => item.id === mediaId) ?? null;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!accountId) return;
      setLoading(true);
      const response = await fetch(
        `/api/instagram/media?instagramAccountId=${accountId}`,
      );
      const body = (await response.json()) as {
        success: boolean;
        data?: { media: MediaItem[] };
        error?: { message: string };
      };
      if (cancelled) return;
      setLoading(false);
      if (!body.success || !body.data) {
        toast.error(body.error?.message ?? "Could not load posts.");
        setMedia([]);
        return;
      }
      setMedia(body.data.media);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [accountId]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const next = media.filter((item) => {
      if (type === "reel" && !isReel(item.mediaType)) return false;
      if (type === "post" && isReel(item.mediaType)) return false;
      if (needle && !(item.caption ?? "").toLowerCase().includes(needle)) {
        return false;
      }
      return true;
    });
    next.sort((a, b) => {
      const av = a.publishedAt ?? "";
      const bv = b.publishedAt ?? "";
      return sort === "newest" ? bv.localeCompare(av) : av.localeCompare(bv);
    });
    return next;
  }, [media, query, type, sort]);

  const reelCount = media.filter((item) => isReel(item.mediaType)).length;
  const postCount = media.length - reelCount;

  function addKeyword() {
    const next = draft.trim();
    if (!next) return;
    if (keywords.some((item) => item.toLowerCase() === next.toLowerCase())) {
      toast.error("That keyword is already added.");
      return;
    }
    setKeywords([...keywords, next]);
    setDraft("");
  }

  function pickMedia(id: string) {
    setMediaId(id);
    setStep(1);
  }

  function goNext() {
    if (step === 0 && !mediaId) {
      toast.error("Select a post or reel.");
      return;
    }
    if (step === 1 && matchType !== "all_comments" && keywords.length === 0) {
      toast.error("Add at least one keyword.");
      return;
    }
    if (step === 2) {
      if (commentOnly) {
        if (!commentReply.trim()) {
          toast.error("Write the public comment reply.");
          return;
        }
      } else if (!message.trim()) {
        toast.error("Write the message for people who already follow you.");
        return;
      }
      if (
        !commentOnly &&
        requireFollow &&
        (!followPrompt.trim() || !notFollowing.trim())
      ) {
        toast.error("Write both follow-gate messages.");
        return;
      }
    }
    setStep((current) => current + 1);
  }

  async function create() {
    setSaving(true);
    try {
      const response = await fetch("/api/automations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name:
            matchType === "exact" || matchType === "contains"
              ? (keywords[0] ?? "Automation")
              : "Any comment",
          keywords:
            matchType === "exact" || matchType === "contains" ? keywords : [],
          matchType:
            matchType === "exact" || matchType === "contains"
              ? matchType
              : "all_comments",
          caseSensitive: false,
          actionType: commentOnly ? "comment_reply" : "private_reply",
          privateReplyMessage: commentOnly ? "" : message,
          requireFollow: commentOnly ? false : requireFollow,
          followPromptMessage: followPrompt,
          notFollowingMessage: notFollowing,
          commentReplyMessage: commentReply,
          ignoreOwnComments,
          enabled,
          instagramAccountId: accountId,
          mediaId,
        }),
      });
      const text = await response.text();
      let body: { success?: boolean; error?: { message: string } } = {};
      try {
        body = text ? (JSON.parse(text) as typeof body) : {};
      } catch {
        toast.error("Could not create automation. Try again.");
        return;
      }
      if (!body.success) {
        toast.error(body.error?.message ?? "Could not create automation", {
          action:
            body.error?.message === "Free plan includes 1 active automation."
              ? {
                  label: "Upgrade to Creator",
                  onClick: () => router.push("/dashboard/settings?tab=billing"),
                }
              : undefined,
        });
        return;
      }
      toast.success("Automation created");
      router.push("/dashboard/automations");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="relative min-w-0 overflow-hidden rounded-[28px] border border-violet-500/20 bg-[radial-gradient(900px_circle_at_100%_-20%,rgba(168,85,247,0.35),transparent_45%),linear-gradient(180deg,rgba(24,16,40,0.95),rgba(10,10,10,0.55))] px-4 py-5 sm:px-6 sm:py-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <InstagramMark size={48} />
            <div>
              <h1 className="text-2xl font-semibold text-white">
                Create Automation
              </h1>
              <p className="text-sm text-zinc-400">
                Set up keyword-based private replies for your Instagram content.
              </p>
            </div>
          </div>
          <InstagramMark
            size={64}
            className="hidden shadow-[0_0_32px_rgba(236,72,153,0.45)] lg:block"
          />
        </div>
        <ol className="mt-6 grid gap-2 sm:grid-cols-4">
          {STEPS.map((label, index) => (
            <li key={label}>
              <button
                type="button"
                disabled={index > step}
                onClick={() => {
                  if (index < step) setStep(index);
                }}
                className={cn(
                  "flex w-full items-center gap-2 rounded-full border px-3 py-2 text-left text-xs font-medium",
                  index === step
                    ? "border-violet-400 bg-violet-600/20 text-white"
                    : index < step
                      ? "border-violet-500/30 text-violet-200 hover:bg-violet-600/10"
                      : "cursor-not-allowed border-white/10 text-zinc-500",
                )}
              >
                <span
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full text-[11px]",
                    index === step
                      ? "bg-violet-600 text-white"
                      : index < step
                        ? "bg-violet-600/50 text-white"
                        : "bg-zinc-800",
                  )}
                >
                  {index + 1}
                </span>
                {label}
              </button>
            </li>
          ))}
        </ol>
      </section>

      {step === 0 ? (
        <StepSelect
          accounts={accounts}
          accountId={accountId}
          onAccount={setAccountId}
          query={query}
          onQuery={setQuery}
          type={type}
          onType={setType}
          sort={sort}
          onSort={setSort}
          loading={loading}
          media={filtered}
          counts={{ all: media.length, reels: reelCount, posts: postCount }}
          mediaId={mediaId}
          onSelect={pickMedia}
          onContinue={goNext}
          filterKey={`${accountId}:${query}:${type}:${sort}`}
        />
      ) : null}

      {step === 1 && selected ? (
        <StepKeywords
          selected={selected}
          keywords={keywords}
          draft={draft}
          matchType={matchType}
          onDraft={setDraft}
          onAdd={addKeyword}
          onRemove={(keyword) =>
            setKeywords(keywords.filter((item) => item !== keyword))
          }
          onSuggest={(keyword) => {
            if (
              keywords.some(
                (item) => item.toLowerCase() === keyword.toLowerCase(),
              )
            ) {
              return;
            }
            setKeywords([...keywords, keyword]);
          }}
          onMatchType={setMatchType}
          onChangeContent={() => setStep(0)}
          onBack={() => setStep(0)}
          onContinue={goNext}
        />
      ) : null}

      {step === 2 && selected ? (
        <StepMessage
          selected={selected}
          keywords={keywords}
          requireFollow={requireFollow}
          onRequireFollow={setRequireFollow}
          commentOnly={commentOnly}
          onCommentOnly={(value) => {
            setCommentOnly(value);
            if (value) setRequireFollow(false);
          }}
          ignoreOwnComments={ignoreOwnComments}
          onIgnoreOwnComments={setIgnoreOwnComments}
          message={message}
          onMessage={setMessage}
          followPrompt={followPrompt}
          onFollowPrompt={setFollowPrompt}
          notFollowing={notFollowing}
          onNotFollowing={setNotFollowing}
          commentReply={commentReply}
          onCommentReply={setCommentReply}
          onChangeContent={() => setStep(0)}
          onBack={() => setStep(1)}
          onContinue={goNext}
        />
      ) : null}

      {step === 3 && selected ? (
        <StepReview
          selected={selected}
          keywords={keywords}
          matchType={matchType}
          requireFollow={requireFollow}
          commentOnly={commentOnly}
          ignoreOwnComments={ignoreOwnComments}
          message={message}
          followPrompt={followPrompt}
          notFollowing={notFollowing}
          commentReply={commentReply}
          enabled={enabled}
          saving={saving}
          onEnabled={setEnabled}
          onEdit={(index) => setStep(index)}
          onBack={() => setStep(2)}
          onCreate={create}
        />
      ) : null}
    </div>
  );
}

function Thumb({ item, className }: { item: MediaItem; className?: string }) {
  if (item.thumbnailUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={item.thumbnailUrl}
        alt=""
        className={cn("object-cover", className)}
      />
    );
  }
  return (
    <div
      className={cn(
        "flex items-center justify-center bg-zinc-900 text-xs text-zinc-500",
        className,
      )}
    >
      {isReel(item.mediaType) ? "REEL" : "POST"}
    </div>
  );
}

function StepSelect({
  accounts,
  accountId,
  onAccount,
  query,
  onQuery,
  type,
  onType,
  sort,
  onSort,
  loading,
  media,
  counts,
  mediaId,
  onSelect,
  onContinue,
  filterKey,
}: {
  accounts: Array<{ id: string; username: string }>;
  accountId: string;
  onAccount: (id: string) => void;
  query: string;
  onQuery: (value: string) => void;
  type: "all" | "reel" | "post";
  onType: (value: "all" | "reel" | "post") => void;
  sort: "newest" | "oldest";
  onSort: (value: "newest" | "oldest") => void;
  loading: boolean;
  media: MediaItem[];
  counts: { all: number; reels: number; posts: number };
  mediaId: string;
  onSelect: (id: string) => void;
  onContinue: () => void;
  filterKey: string;
}) {
  const pageSize = 8;
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(media.length / pageSize));
  const safePage = Math.min(page, pages - 1);
  const slice = media.slice(
    safePage * pageSize,
    safePage * pageSize + pageSize,
  );

  useEffect(() => {
    setPage(0);
  }, [filterKey]);

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-white">
          1. Select Instagram Content
        </h2>
        <p className="text-sm text-zinc-400">
          Choose the post or reel for this automation.
        </p>
      </div>
      {accounts.length > 1 ? (
        <select
          value={accountId}
          onChange={(event) => onAccount(event.target.value)}
          className="h-11 rounded-full border border-white/10 bg-black/40 px-4 text-sm text-white"
        >
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              @{account.username}
            </option>
          ))}
        </select>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={query}
          onChange={(event) => onQuery(event.target.value)}
          placeholder="Search posts or reels..."
          className="h-11 min-w-0 flex-1 rounded-full border border-white/10 bg-black/40 px-4 text-sm text-white outline-none sm:min-w-[180px]"
        />
        {(
          [
            ["all", `All (${counts.all})`],
            ["reel", `Reels (${counts.reels})`],
            ["post", `Posts (${counts.posts})`],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => onType(value)}
            className={cn(
              "rounded-full px-4 py-2 text-sm",
              type === value
                ? "bg-violet-600 text-white"
                : "border border-white/10 text-zinc-400",
            )}
          >
            {label}
          </button>
        ))}
        <select
          value={sort}
          onChange={(event) => onSort(event.target.value as typeof sort)}
          className="h-11 rounded-full border border-white/10 bg-black/40 px-3 text-sm text-zinc-200"
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
        </select>
      </div>
      {loading ? (
        <p className="text-sm text-zinc-500">Loading posts and reels…</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {slice.map((item) => {
            const active = item.id === mediaId;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelect(item.id)}
                className={cn(
                  "overflow-hidden rounded-3xl border bg-zinc-950/70 text-left transition",
                  active
                    ? "border-violet-400 shadow-[0_0_24px_rgba(124,58,237,0.35)]"
                    : "border-white/10 hover:border-violet-500/40",
                )}
              >
                <div className="relative aspect-[3/4]">
                  <Thumb item={item} className="h-full w-full" />
                  <span className="absolute left-3 top-3 rounded-full bg-black/70 px-2 py-1 text-[10px] font-semibold uppercase text-white">
                    {isReel(item.mediaType) ? "Reel" : "Post"}
                  </span>
                  {active ? (
                    <span className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-violet-600 text-white">
                      <Check className="h-4 w-4" />
                    </span>
                  ) : null}
                  <span className="absolute inset-0 flex items-center justify-center bg-black/35">
                    <span className="flex h-14 w-14 items-center justify-center rounded-full bg-violet-600 text-white shadow-[0_0_24px_rgba(124,58,237,0.7)]">
                      <Plus className="h-7 w-7" />
                    </span>
                  </span>
                </div>
                <div className="p-4">
                  <p className="line-clamp-1 text-sm font-semibold text-white">
                    {titleOf(item.caption)}
                  </p>
                  <p className="mt-1 text-[11px] text-zinc-500">
                    {formatDate(item.publishedAt)}
                  </p>
                  {mediaStats(item) ? (
                    <p className="mt-1 text-[11px] text-zinc-400">
                      {mediaStats(item)}
                    </p>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-500">
        <p>
          Showing {media.length === 0 ? 0 : safePage * pageSize + 1}–
          {Math.min(media.length, (safePage + 1) * pageSize)} of {media.length}
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
        <Button onClick={onContinue}>Continue →</Button>
      </div>
    </section>
  );
}

function SelectedCard({
  item,
  extra,
  onChange,
}: {
  item: MediaItem;
  extra?: ReactNode;
  onChange: () => void;
}) {
  return (
    <aside className="space-y-4 rounded-3xl border border-white/10 bg-zinc-950/70 p-4 xl:w-[320px]">
      <p className="text-sm font-semibold text-white">Selected Content</p>
      <div className="overflow-hidden rounded-2xl">
        <div className="relative h-44">
          <Thumb item={item} className="h-full w-full" />
          <span className="absolute left-3 top-3 rounded-full bg-black/70 px-2 py-1 text-[10px] font-semibold uppercase text-white">
            {isReel(item.mediaType) ? "Reel" : "Post"}
          </span>
        </div>
      </div>
      <div>
        <p className="font-medium text-white">{titleOf(item.caption)}</p>
        <p className="text-xs text-zinc-500">{formatDate(item.publishedAt)}</p>
        {mediaStats(item) ? (
          <p className="text-xs text-zinc-400">{mediaStats(item)}</p>
        ) : null}
      </div>
      {item.permalink ? (
        <a
          href={item.permalink}
          target="_blank"
          rel="noreferrer"
          className="text-sm text-violet-300 hover:text-white"
        >
          View on Instagram →
        </a>
      ) : null}
      {item.caption ? (
        <p className="line-clamp-4 text-xs text-zinc-500">{item.caption}</p>
      ) : null}
      {extra}
      <button
        type="button"
        onClick={onChange}
        className="text-sm text-violet-300 hover:text-white"
      >
        ← Change Content
      </button>
    </aside>
  );
}

function StepKeywords({
  selected,
  keywords,
  draft,
  matchType,
  onDraft,
  onAdd,
  onRemove,
  onSuggest,
  onMatchType,
  onChangeContent,
  onBack,
  onContinue,
}: {
  selected: MediaItem;
  keywords: string[];
  draft: string;
  matchType: "contains" | "exact" | "all_comments";
  onDraft: (value: string) => void;
  onAdd: () => void;
  onRemove: (keyword: string) => void;
  onSuggest: (keyword: string) => void;
  onMatchType: (value: "contains" | "exact" | "all_comments") => void;
  onChangeContent: () => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-white">
          2. When they comment
        </h2>
        <p className="text-sm text-zinc-400">
          Match specific words, or reply to any comment on this Reel or post.
          Still one Meta reply per comment — not a blast.
        </p>
      </div>
      <div className="flex flex-col gap-6 xl:flex-row">
        <SelectedCard item={selected} onChange={onChangeContent} />
        <div className="min-w-0 flex-1 space-y-5">
          <div className="grid gap-3 sm:grid-cols-3">
            {(
              [
                [
                  "contains",
                  "Specific words",
                  "Comment contains PRICE, LINK, TRAIN…",
                ],
                ["exact", "Exact word", "Comment is exactly that keyword"],
                [
                  "all_comments",
                  "Any comment",
                  "Every comment on this media, one reply each",
                ],
              ] as const
            ).map(([value, title, hint]) => (
              <button
                key={value}
                type="button"
                onClick={() => onMatchType(value)}
                className={cn(
                  "rounded-2xl border p-4 text-left",
                  matchType === value
                    ? "border-violet-400 bg-violet-600/15"
                    : "border-white/10",
                )}
              >
                <p className="text-sm font-semibold text-white">{title}</p>
                <p className="mt-1 text-xs text-zinc-400">{hint}</p>
              </button>
            ))}
          </div>
          {matchType === "all_comments" ? (
            <p className="rounded-2xl border border-white/10 p-4 text-sm text-zinc-400">
              No keyword list. Anyone who comments on the selected Reel or post
              gets one eligible reply.
            </p>
          ) : (
            <>
              <div className="flex gap-2">
                <input
                  value={draft}
                  onChange={(event) => onDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      onAdd();
                    }
                  }}
                  placeholder="Type a keyword and press Enter..."
                  className="h-12 flex-1 rounded-2xl border border-white/10 bg-black/40 px-4 text-sm text-white outline-none"
                />
                <Button type="button" onClick={onAdd}>
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {SUGGESTED_KEYWORDS.map((keyword) => (
                  <button
                    key={keyword}
                    type="button"
                    onClick={() => onSuggest(keyword)}
                    className="rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-300 hover:border-violet-400 hover:text-white"
                  >
                    + {keyword}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {keywords.map((keyword) => (
                  <button
                    key={keyword}
                    type="button"
                    onClick={() => onRemove(keyword)}
                    className="rounded-full bg-violet-600/25 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-violet-100"
                  >
                    {keyword} ×
                  </button>
                ))}
              </div>
            </>
          )}
          <div className="flex justify-between">
            <Button variant="secondary" onClick={onBack}>
              ← Back
            </Button>
            <Button onClick={onContinue}>Continue →</Button>
          </div>
        </div>
      </div>
    </section>
  );
}

type MessageField = "link" | "follow" | "still" | "comment";

function append(current: string, token: string) {
  return `${current}${current.endsWith(" ") || current.endsWith("\n") ? "" : " "}${token}`;
}

function FieldBox({
  title,
  hint,
  value,
  onChange,
  active,
  onFocus,
}: {
  title: string;
  hint: string;
  value: string;
  onChange: (value: string) => void;
  active: boolean;
  onFocus: () => void;
}) {
  return (
    <div
      className={cn(
        "rounded-3xl border p-4",
        active ? "border-violet-400 bg-violet-600/10" : "border-white/10",
      )}
    >
      <p className="text-sm font-semibold text-white">{title}</p>
      <p className="mt-1 text-xs text-zinc-400">{hint}</p>
      <textarea
        value={value}
        onFocus={onFocus}
        onChange={(event) => onChange(event.target.value)}
        rows={5}
        className="mt-3 w-full rounded-2xl border border-white/10 bg-black/40 p-3 text-sm text-white outline-none"
      />
      <p className="mt-1 text-right text-[11px] text-zinc-500">
        {value.length}/1000
      </p>
    </div>
  );
}

function StepMessage({
  selected,
  keywords,
  requireFollow,
  onRequireFollow,
  commentOnly,
  onCommentOnly,
  ignoreOwnComments,
  onIgnoreOwnComments,
  message,
  onMessage,
  followPrompt,
  onFollowPrompt,
  notFollowing,
  onNotFollowing,
  commentReply,
  onCommentReply,
  onChangeContent,
  onBack,
  onContinue,
}: {
  selected: MediaItem;
  keywords: string[];
  requireFollow: boolean;
  onRequireFollow: (value: boolean) => void;
  commentOnly: boolean;
  onCommentOnly: (value: boolean) => void;
  ignoreOwnComments: boolean;
  onIgnoreOwnComments: (value: boolean) => void;
  message: string;
  onMessage: (value: string) => void;
  followPrompt: string;
  onFollowPrompt: (value: string) => void;
  notFollowing: string;
  onNotFollowing: (value: string) => void;
  commentReply: string;
  onCommentReply: (value: string) => void;
  onChangeContent: () => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const [tab, setTab] = useState<"text" | "media" | "quick">("text");
  const [active, setActive] = useState<MessageField>("link");
  const [mediaUrl, setMediaUrl] = useState(selected.permalink ?? "");

  const setters: Record<MessageField, (value: string) => void> = {
    link: onMessage,
    follow: onFollowPrompt,
    still: onNotFollowing,
    comment: onCommentReply,
  };
  const values: Record<MessageField, string> = {
    link: message,
    follow: followPrompt,
    still: notFollowing,
    comment: commentReply,
  };

  function insert(token: string) {
    setters[active](append(values[active], token));
  }

  function addMediaLink(url = mediaUrl.trim() || selected.permalink || "") {
    if (!url) {
      toast.error("Paste an https link first.");
      return;
    }
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "https:") {
        toast.error("Use an https link.");
        return;
      }
    } catch {
      toast.error("That is not a valid URL.");
      return;
    }
    insert(url);
    toast.success("Link added to the selected message.");
  }

  const tabs = [
    { id: "text" as const, label: "Text Message" },
    { id: "media" as const, label: "Media Reply" },
    { id: "quick" as const, label: "Quick Reply" },
  ];

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-white">
          3. What they receive
        </h2>
        <p className="text-sm text-zinc-400">
          Private reply, public comment, or both. Follow-gate is optional.
        </p>
      </div>
      <div className="flex flex-col gap-6 xl:flex-row">
        <SelectedCard
          item={selected}
          onChange={onChangeContent}
          extra={
            <div className="flex flex-wrap gap-1">
              {keywords.map((keyword) => (
                <span
                  key={keyword}
                  className="rounded-full bg-violet-600/20 px-2 py-0.5 text-[10px] font-semibold uppercase text-violet-200"
                >
                  {keyword}
                </span>
              ))}
            </div>
          }
        />
        <div className="min-w-0 flex-1 space-y-4">
          <label className="flex items-center justify-between rounded-2xl border border-white/10 px-4 py-3 text-sm text-white">
            Comment reply only — no private DM
            <input
              type="checkbox"
              checked={commentOnly}
              onChange={(event) => onCommentOnly(event.target.checked)}
              className="h-4 w-4 accent-violet-600"
            />
          </label>
          <label className="flex items-center justify-between rounded-2xl border border-white/10 px-4 py-3 text-sm text-white">
            Ignore comments from this Instagram account
            <input
              type="checkbox"
              checked={ignoreOwnComments}
              onChange={(event) => onIgnoreOwnComments(event.target.checked)}
              className="h-4 w-4 accent-violet-600"
            />
          </label>
          {commentOnly ? null : (
            <label className="flex items-center justify-between rounded-2xl border border-white/10 px-4 py-3 text-sm text-white">
              Ask them to follow before sending the link
              <input
                type="checkbox"
                checked={requireFollow}
                onChange={(event) => onRequireFollow(event.target.checked)}
                className="h-4 w-4 accent-violet-600"
              />
            </label>
          )}

          <div className="flex flex-wrap gap-1 rounded-full border border-white/10 p-1 text-sm">
            {tabs.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={cn(
                  "rounded-full px-4 py-1.5",
                  tab === item.id
                    ? "bg-violet-600 text-white"
                    : "text-zinc-400 hover:text-white",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>

          {tab === "text" ? (
            <p className="text-sm text-zinc-400">
              Type in the highlighted box. Insert{" "}
              <button
                type="button"
                className="text-violet-300 underline"
                onClick={() => insert("@username")}
              >
                @username
              </button>{" "}
              for the commenter, or{" "}
              <button
                type="button"
                className="text-violet-300 underline"
                onClick={() => insert("{account}")}
              >
                {"{account}"}
              </button>{" "}
              for your handle.
            </p>
          ) : null}

          {tab === "media" ? (
            <div className="space-y-3 rounded-3xl border border-white/10 bg-black/40 p-4">
              <p className="text-sm text-zinc-300">
                Instagram private replies cannot attach a photo or video file.
                Add an https link (catalog, Drive, website, or this post) to the
                highlighted message.
              </p>
              <input
                value={mediaUrl}
                onChange={(event) => setMediaUrl(event.target.value)}
                placeholder="https://example.com/train"
                className="h-11 w-full rounded-2xl border border-white/10 bg-black px-4 text-sm text-white outline-none"
              />
              <div className="flex flex-wrap gap-2">
                {selected.permalink ? (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => addMediaLink(selected.permalink ?? "")}
                  >
                    Add this post’s Instagram link
                  </Button>
                ) : null}
                <Button type="button" onClick={() => addMediaLink()}>
                  Add link to selected message
                </Button>
              </div>
            </div>
          ) : null}

          {tab === "quick" ? (
            <div className="space-y-3">
              <p className="text-sm text-zinc-400">
                Click a template to fill the highlighted box. You can edit it
                after.
              </p>
              <div className="grid gap-3">
                {(
                  [
                    {
                      label: "Link for followers",
                      field: "link" as const,
                      text: DEFAULT_MESSAGES.link,
                    },
                    {
                      label: "Ask to follow",
                      field: "follow" as const,
                      text: DEFAULT_MESSAGES.followPrompt,
                    },
                    {
                      label: "Still not following",
                      field: "still" as const,
                      text: DEFAULT_MESSAGES.notFollowing,
                    },
                    {
                      label: "Public comment reply",
                      field: "comment" as const,
                      text: DEFAULT_MESSAGES.commentReply,
                    },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => {
                      setters[item.field](item.text);
                      setActive(item.field);
                      toast.success(`${item.label} applied.`);
                    }}
                    className="rounded-2xl border border-white/10 bg-black/40 p-4 text-left hover:border-violet-400"
                  >
                    <p className="text-sm font-semibold text-white">
                      {item.label}
                    </p>
                    <p className="mt-1 line-clamp-3 text-xs text-zinc-400">
                      {item.text}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {commentOnly ? null : (
            <FieldBox
              title="Already following — send the link"
              hint="Used immediately if they already follow you, or after they follow and reply Done."
              value={message}
              onChange={onMessage}
              active={active === "link"}
              onFocus={() => setActive("link")}
            />
          )}

          {commentOnly ? null : requireFollow ? (
            <>
              <FieldBox
                title="Not following yet — ask them to follow"
                hint="First DM after their comment if they do not follow you. Ask them to follow and reply Done."
                value={followPrompt}
                onChange={onFollowPrompt}
                active={active === "follow"}
                onFocus={() => setActive("follow")}
              />
              <FieldBox
                title="They replied Done, but still do not follow"
                hint="Sent when they reply in the DM without following yet."
                value={notFollowing}
                onChange={onNotFollowing}
                active={active === "still"}
                onFocus={() => setActive("still")}
              />
            </>
          ) : (
            <p className="text-xs text-zinc-500">
              Follow gate is off. Everyone who matches a keyword gets the link
              message above.
            </p>
          )}

          <FieldBox
            title={
              commentOnly
                ? "Public comment reply"
                : "Public comment reply (optional)"
            }
            hint={
              commentOnly
                ? "Posted on the comment. No private DM is sent."
                : "Posted on the comment after the private reply. Leave empty to skip."
            }
            value={commentReply}
            onChange={onCommentReply}
            active={active === "comment"}
            onFocus={() => setActive("comment")}
          />

          <div className="rounded-3xl border border-white/10 bg-black/40 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Preview
            </p>
            <div className="mt-3 max-w-sm rounded-2xl bg-violet-600/20 px-4 py-3 text-sm text-white">
              {commentOnly
                ? commentReply || "Public comment reply…"
                : message || "Private reply…"}
            </div>
          </div>

          <div className="flex justify-between">
            <Button variant="secondary" onClick={onBack}>
              ← Back
            </Button>
            <Button onClick={onContinue}>Continue →</Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function StepReview({
  selected,
  keywords,
  matchType,
  requireFollow,
  commentOnly,
  ignoreOwnComments,
  message,
  followPrompt,
  notFollowing,
  commentReply,
  enabled,
  saving,
  onEnabled,
  onEdit,
  onBack,
  onCreate,
}: {
  selected: MediaItem;
  keywords: string[];
  matchType: "contains" | "exact" | "all_comments";
  requireFollow: boolean;
  commentOnly: boolean;
  ignoreOwnComments: boolean;
  message: string;
  followPrompt: string;
  notFollowing: string;
  commentReply: string;
  enabled: boolean;
  saving: boolean;
  onEnabled: (value: boolean) => void;
  onEdit: (step: number) => void;
  onBack: () => void;
  onCreate: () => void;
}) {
  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-white">
          4. Review Your Automation
        </h2>
        <p className="text-sm text-zinc-400">
          Please review the details below before creating the automation.
        </p>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-3xl border border-white/10 bg-zinc-950/70 p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-white">Content</p>
            <button
              type="button"
              className="flex items-center gap-1 text-xs text-violet-300"
              onClick={() => onEdit(0)}
            >
              <Pencil className="h-3 w-3" /> Edit
            </button>
          </div>
          <div className="flex gap-3">
            <Thumb item={selected} className="h-24 w-20 rounded-xl" />
            <div>
              <p className="text-[10px] uppercase text-violet-300">
                {isReel(selected.mediaType) ? "Reel" : "Post"}
              </p>
              <p className="font-medium text-white">
                {titleOf(selected.caption)}
              </p>
              <p className="text-xs text-zinc-500">
                {formatDate(selected.publishedAt)}
              </p>
              {mediaStats(selected) ? (
                <p className="text-xs text-zinc-400">{mediaStats(selected)}</p>
              ) : null}
            </div>
          </div>
        </div>
        <div className="rounded-3xl border border-white/10 bg-zinc-950/70 p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-white">
              {matchType === "all_comments"
                ? "Any comment on this media"
                : `Keywords (${keywords.length})`}
            </p>
            <button
              type="button"
              className="flex items-center gap-1 text-xs text-violet-300"
              onClick={() => onEdit(1)}
            >
              <Pencil className="h-3 w-3" /> Edit
            </button>
          </div>
          <div className="flex flex-wrap gap-1">
            {keywords.map((keyword) => (
              <span
                key={keyword}
                className="rounded-full bg-violet-600/20 px-2 py-0.5 text-[10px] font-semibold uppercase text-violet-200"
              >
                {keyword}
              </span>
            ))}
          </div>
          <p className="mt-3 text-xs text-zinc-500">
            Matching:{" "}
            {matchType === "all_comments"
              ? "Any comment"
              : matchType === "exact"
                ? "Exact keyword"
                : "Contains keyword"}
          </p>
        </div>
        <div className="rounded-3xl border border-white/10 bg-zinc-950/70 p-4 xl:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-white">Messages</p>
            <button
              type="button"
              className="flex items-center gap-1 text-xs text-violet-300"
              onClick={() => onEdit(2)}
            >
              <Pencil className="h-3 w-3" /> Edit
            </button>
          </div>
          <p className="text-xs font-medium text-zinc-500">
            Already following — link
          </p>
          <pre className="mt-1 whitespace-pre-wrap font-sans text-sm text-zinc-200">
            {message}
          </pre>
          {requireFollow ? (
            <>
              <p className="mt-4 text-xs font-medium text-zinc-500">
                Not following yet — follow prompt
              </p>
              <pre className="mt-1 whitespace-pre-wrap font-sans text-sm text-zinc-200">
                {followPrompt}
              </pre>
              <p className="mt-4 text-xs font-medium text-zinc-500">
                Replied Done but still not following
              </p>
              <pre className="mt-1 whitespace-pre-wrap font-sans text-sm text-zinc-200">
                {notFollowing}
              </pre>
            </>
          ) : (
            <p className="mt-3 text-xs text-zinc-500">
              Follow gate is off. The link message is sent to everyone.
            </p>
          )}
          {commentReply.trim() ? (
            <>
              <p className="mt-4 text-xs font-medium text-zinc-500">
                Public comment reply
              </p>
              <pre className="mt-1 whitespace-pre-wrap font-sans text-sm text-zinc-200">
                {commentReply}
              </pre>
            </>
          ) : null}
        </div>
        <div className="rounded-3xl border border-white/10 bg-zinc-950/70 p-4 xl:col-span-2">
          <p className="mb-3 text-sm font-semibold text-white">
            Automation Settings
          </p>
          <label className="flex items-center justify-between gap-3 text-sm text-white">
            Enable automation (start immediately)
            <input
              type="checkbox"
              checked={enabled}
              onChange={(event) => onEnabled(event.target.checked)}
              className="h-4 w-4 accent-violet-600"
            />
          </label>
          <p className="mt-2 text-xs text-zinc-500">
            {commentOnly
              ? "Public comment reply only — no private DM."
              : "Instagram allows only one private reply per comment. That is already enforced."}{" "}
            {ignoreOwnComments
              ? "Comments from this account are ignored."
              : "Comments from this account can match."}
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <Button variant="secondary" onClick={onBack}>
          ← Back
        </Button>
        <Button onClick={onCreate} disabled={saving}>
          {saving ? "Creating…" : "Create Automation →"}
        </Button>
      </div>
      <p className="text-center text-xs text-zinc-600">
        <Link href="/dashboard/automations">Cancel and return to list</Link>
      </p>
    </section>
  );
}
