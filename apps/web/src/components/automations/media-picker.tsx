"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
import { LoadingState } from "@/components/ui/loading-state";
import { cn } from "@/lib/utils";

export type MediaOption = {
  id: string;
  instagramMediaId: string;
  mediaType: string;
  caption: string | null;
  thumbnailUrl: string | null;
  permalink: string | null;
  publishedAt: string | null;
};

const filters = ["ALL", "REELS", "IMAGE", "VIDEO", "CAROUSEL_ALBUM"] as const;

export function MediaPicker({
  accountId,
  value,
  onChange,
  onSelected,
  compact = false,
}: {
  accountId: string;
  value: string;
  onChange: (mediaId: string) => void;
  onSelected?: (item: MediaOption | null) => void;
  compact?: boolean;
}) {
  const [media, setMedia] = useState<MediaOption[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<(typeof filters)[number]>("ALL");
  const [picking, setPicking] = useState(!value);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      const response = await fetch(
        `/api/instagram/media?instagramAccountId=${accountId}`,
      );
      const body = (await response.json()) as {
        success: boolean;
        data?: { media: MediaOption[] };
        error?: { message: string };
      };
      if (cancelled) {
        return;
      }
      setLoading(false);
      if (!body.success || !body.data) {
        setError(body.error?.message ?? "Instagram media could not be loaded.");
        setMedia([]);
        return;
      }
      setMedia(body.data.media);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [accountId, reloadKey]);

  const visible = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return media.filter((item) => {
      const typeOk = filter === "ALL" || item.mediaType === filter;
      const caption = item.caption?.toLocaleLowerCase() ?? "";
      return typeOk && (!needle || caption.includes(needle));
    });
  }, [filter, media, query]);

  const selected = media.find((item) => item.id === value);
  const onSelectedRef = useRef(onSelected);
  onSelectedRef.current = onSelected;

  useEffect(() => {
    onSelectedRef.current?.(selected ?? null);
  }, [selected]);

  if (compact && selected && !picking) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/40 p-2">
        <Thumbnail item={selected} />
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-wide text-zinc-500">
            {labelFor(selected.mediaType)}
            {selected.publishedAt
              ? ` · ${new Date(selected.publishedAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}`
              : ""}
          </p>
          <p className="line-clamp-1 text-sm text-white">
            {selected.caption || "Untitled"}
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => setPicking(true)}
        >
          Change
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search captions"
        />
        <Button
          type="button"
          variant="secondary"
          onClick={() => setReloadKey((value) => value + 1)}
        >
          Refresh
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {filters.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setFilter(item)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs",
              filter === item
                ? "border-violet-400 bg-violet-600/20 text-white"
                : "border-zinc-800 text-zinc-400",
            )}
          >
            {item === "ALL"
              ? "All"
              : item === "CAROUSEL_ALBUM"
                ? "Carousel"
                : item.charAt(0) + item.slice(1).toLowerCase()}
          </button>
        ))}
      </div>
      {loading ? <LoadingState label="Loading posts and reels" /> : null}
      {error ? <ErrorState message={error} /> : null}
      {!loading && !error && visible.length === 0 ? (
        <p className="text-sm text-zinc-500">
          No posts or reels match this filter.
        </p>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        {visible.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              onChange(item.id);
              setPicking(false);
            }}
            className={cn(
              "flex gap-3 rounded-2xl border p-3 text-left transition",
              value === item.id
                ? "border-violet-400 bg-violet-600/10"
                : "border-zinc-800 hover:border-zinc-600",
            )}
          >
            <Thumbnail item={item} />
            <span className="min-w-0">
              <span className="flex items-center gap-2">
                <Badge tone="purple">{labelFor(item.mediaType)}</Badge>
              </span>
              <span className="mt-2 block line-clamp-2 text-sm text-white">
                {item.caption || "Untitled"}
              </span>
              <span className="mt-1 block text-xs text-zinc-500">
                {item.publishedAt
                  ? new Date(item.publishedAt).toLocaleDateString()
                  : "Date unavailable"}
              </span>
              {item.permalink ? (
                <span className="mt-1 block truncate text-xs text-violet-300">
                  {item.permalink}
                </span>
              ) : null}
            </span>
          </button>
        ))}
      </div>
      {selected ? (
        <div className="flex gap-4 rounded-2xl border border-violet-500/30 bg-black p-4">
          <Thumbnail item={selected} />
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-violet-300">
              Selected media
            </p>
            <p className="mt-1 text-sm text-white">
              {selected.caption || "Untitled"}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              {labelFor(selected.mediaType)}
              {selected.publishedAt
                ? ` · ${new Date(selected.publishedAt).toLocaleDateString()}`
                : ""}
            </p>
            {selected.permalink ? (
              <p className="mt-1 truncate text-xs text-violet-300">
                {selected.permalink}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Thumbnail({ item }: { item: MediaOption }) {
  if (item.thumbnailUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={item.thumbnailUrl}
        alt=""
        className="h-16 w-16 shrink-0 rounded-xl object-cover"
      />
    );
  }
  return (
    <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-700 to-zinc-900 text-[10px] font-semibold uppercase tracking-wide text-white">
      {labelFor(item.mediaType)}
    </span>
  );
}

function labelFor(mediaType: string) {
  if (mediaType === "CAROUSEL_ALBUM") return "Carousel";
  if (mediaType === "REELS") return "Reel";
  if (mediaType === "IMAGE") return "Post";
  return mediaType.charAt(0) + mediaType.slice(1).toLowerCase();
}
