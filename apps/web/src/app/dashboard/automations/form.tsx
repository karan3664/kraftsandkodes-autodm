"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  automationInputSchema,
  DEFAULT_MESSAGES,
  type AutomationInput,
} from "@kdl/shared";
import { MediaPicker } from "@/components/automations/media-picker";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

const PAGE_STEPS = ["Account", "Reel or post", "Settings", "Review"] as const;
const RAIL_STEPS = [
  "Select Content",
  "Keywords",
  "Reply Message",
  "Review & Create",
] as const;

export function AutomationForm({
  accounts,
  initial,
  layout = "page",
  onClose,
}: {
  accounts: Array<{ id: string; username: string }>;
  initial?: AutomationInput & { id: string };
  layout?: "page" | "rail";
  onClose?: () => void;
}) {
  const router = useRouter();
  const rail = layout === "rail";
  const [draftKeyword, setDraftKeyword] = useState("");
  const [step, setStep] = useState(0);
  const [selectedMedia, setSelectedMedia] = useState<{
    caption: string | null;
    mediaType: string;
    permalink: string | null;
    publishedAt: string | null;
  } | null>(null);
  const form = useForm<AutomationInput>({
    resolver: zodResolver(automationInputSchema),
    defaultValues: {
      name: initial?.name ?? "Train Link",
      keywords: initial?.keywords ?? ["TRAIN", "TRAIN LINK", "LINK"],
      matchType: initial?.matchType ?? "contains",
      caseSensitive: initial?.caseSensitive ?? false,
      actionType: initial?.actionType ?? "private_reply",
      privateReplyMessage:
        initial?.privateReplyMessage ?? DEFAULT_MESSAGES.link,
      requireFollow: initial?.requireFollow ?? true,
      followPromptMessage:
        initial?.followPromptMessage ?? DEFAULT_MESSAGES.followPrompt,
      notFollowingMessage:
        initial?.notFollowingMessage ?? DEFAULT_MESSAGES.notFollowing,
      commentReplyMessage:
        initial?.commentReplyMessage ?? DEFAULT_MESSAGES.commentReply,
      ignoreOwnComments: initial?.ignoreOwnComments ?? true,
      enabled: initial?.enabled ?? true,
      instagramAccountId: initial?.instagramAccountId ?? accounts[0]?.id ?? "",
      mediaId: initial?.mediaId ?? "",
    },
  });

  const wizard = !initial;
  const keywords = form.watch("keywords");
  const accountId = form.watch("instagramAccountId");
  const message = form.watch("privateReplyMessage");
  const commentReply = form.watch("commentReplyMessage");
  const requireFollow = form.watch("requireFollow");
  const automationName = form.watch("name");
  const enabled = form.watch("enabled");
  const matchType = form.watch("matchType");
  const account = accounts.find((item) => item.id === accountId);
  const labels = rail ? RAIL_STEPS : PAGE_STEPS;

  function addKeyword() {
    const next = draftKeyword.trim();
    if (!next) {
      return;
    }
    form.setValue("keywords", [...keywords, next], { shouldValidate: true });
    setDraftKeyword("");
  }

  async function onSubmit(values: AutomationInput) {
    const response = await fetch(
      initial ? `/api/automations/${initial.id}` : "/api/automations",
      {
        method: initial ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          name: values.name || values.keywords[0] || "Automation",
        }),
      },
    );
    const body = (await response.json()) as {
      success: boolean;
      error?: { message: string };
    };
    if (!body.success) {
      toast.error(body.error?.message ?? "Could not save automation");
      return;
    }
    toast.success(initial ? "Automation updated" : "Automation created");
    router.push("/dashboard/automations");
    router.refresh();
    onClose?.();
  }

  function goNext() {
    if (rail) {
      if (step === 0 && (!accountId || !form.getValues("mediaId"))) {
        toast.error("Select a post or reel.");
        return;
      }
      if (step === 1 && keywords.length === 0) {
        toast.error("Add a keyword.");
        return;
      }
      if (step === 2 && !message.trim()) {
        toast.error("Add a private reply.");
        return;
      }
      setStep((current) => current + 1);
      return;
    }
    if (step === 0 && !accountId) {
      toast.error("Select an Instagram account.");
      return;
    }
    if (step === 1 && !form.getValues("mediaId")) {
      toast.error("Select a post or reel.");
      return;
    }
    if (step === 2 && (keywords.length === 0 || !message.trim())) {
      toast.error("Add a keyword and a private reply.");
      return;
    }
    setStep((current) => current + 1);
  }

  const keywordEditor = (
    <div className="space-y-2">
      <Label htmlFor="keyword">Keywords</Label>
      <div className="flex gap-2">
        <Input
          id="keyword"
          value={draftKeyword}
          onChange={(event) => setDraftKeyword(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addKeyword();
            }
          }}
          placeholder="Add a keyword and press Enter..."
        />
        <Button type="button" variant="secondary" onClick={addKeyword}>
          Add
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {keywords.map((keyword, index) => (
          <button
            key={`${keyword}-${index}`}
            type="button"
            className="rounded-full border border-violet-500/40 bg-violet-600/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-violet-100"
            onClick={() =>
              form.setValue(
                "keywords",
                keywords.filter((_, itemIndex) => itemIndex !== index),
                { shouldValidate: true },
              )
            }
          >
            {keyword} ×
          </button>
        ))}
      </div>
    </div>
  );

  const settingsFields = (
    <>
      {!rail ? (
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" {...form.register("name")} />
        </div>
      ) : null}
      {keywordEditor}
      {!rail ? (
        <>
          <div className="space-y-2">
            <Label>Match type</Label>
            <Controller
              control={form.control}
              name="matchType"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  options={[
                    { value: "contains", label: "Contains" },
                    { value: "exact", label: "Exact" },
                    {
                      value: "all_comments",
                      label: "Any comment on this media",
                    },
                  ]}
                />
              )}
            />
          </div>
          <div className="flex items-center justify-between rounded-xl border border-zinc-800 px-4 py-3">
            <div>
              <p className="text-sm text-white">Case sensitive</p>
              <p className="text-xs text-zinc-500">
                Off matches TRAIN and train.
              </p>
            </div>
            <Controller
              control={form.control}
              name="caseSensitive"
              render={({ field }) => (
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
          </div>
          <div className="flex items-center justify-between rounded-xl border border-zinc-800 px-4 py-3">
            <div>
              <p className="text-sm text-white">Ignore own comments</p>
              <p className="text-xs text-zinc-500">
                Skip comments from this connected Instagram account.
              </p>
            </div>
            <Controller
              control={form.control}
              name="ignoreOwnComments"
              render={({ field }) => (
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
          </div>
          <div className="flex items-center justify-between rounded-xl border border-zinc-800 px-4 py-3">
            <div>
              <p className="text-sm text-white">Comment reply only</p>
              <p className="text-xs text-zinc-500">
                Public comment reply, no private DM.
              </p>
            </div>
            <Controller
              control={form.control}
              name="actionType"
              render={({ field }) => (
                <Switch
                  checked={field.value === "comment_reply"}
                  onCheckedChange={(checked) =>
                    field.onChange(checked ? "comment_reply" : "private_reply")
                  }
                />
              )}
            />
          </div>
        </>
      ) : null}
      <div className="flex items-center justify-between rounded-xl border border-zinc-800 px-4 py-3">
        <div>
          <p className="text-sm text-white">
            {rail ? "Enable automation" : "Enabled"}
          </p>
          <p className="text-xs text-zinc-500">
            {rail
              ? "Automatically reply to matching comments"
              : "Only enabled automations send replies."}
          </p>
        </div>
        <Controller
          control={form.control}
          name="enabled"
          render={({ field }) => (
            <Switch checked={field.value} onCheckedChange={field.onChange} />
          )}
        />
      </div>
      {rail ? (
        <div className="flex items-center justify-between rounded-xl border border-zinc-800 px-4 py-3">
          <div>
            <p className="text-sm text-white">Match exact keyword first</p>
            <p className="text-xs text-zinc-500">
              If multiple keywords match, use exact match.
            </p>
          </div>
          <Controller
            control={form.control}
            name="matchType"
            render={({ field }) => (
              <Switch
                checked={field.value === "exact"}
                onCheckedChange={(checked) =>
                  field.onChange(checked ? "exact" : "contains")
                }
              />
            )}
          />
        </div>
      ) : null}
      <div className="flex items-center justify-between rounded-xl border border-zinc-800 px-4 py-3">
        <div>
          <p className="text-sm text-white">Only if they follow</p>
          <p className="text-xs text-zinc-500">
            Existing followers get the link immediately.
          </p>
        </div>
        <Controller
          control={form.control}
          name="requireFollow"
          render={({ field }) => (
            <Switch checked={field.value} onCheckedChange={field.onChange} />
          )}
        />
      </div>
      {!rail && requireFollow ? (
        <>
          <div className="space-y-2">
            <Label htmlFor="follow-prompt">Follow message</Label>
            <Textarea
              id="follow-prompt"
              rows={4}
              {...form.register("followPromptMessage")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="not-following">Not following yet</Label>
            <Textarea
              id="not-following"
              rows={4}
              {...form.register("notFollowingMessage")}
            />
          </div>
        </>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor="message">
          {rail ? "Private Reply Message" : "Link message"}
        </Label>
        <Textarea
          id="message"
          rows={rail ? 6 : 4}
          {...form.register("privateReplyMessage")}
        />
        {rail ? (
          <p className="text-right text-[11px] text-zinc-500">
            {message.length} characters
          </p>
        ) : (
          <p className="text-xs text-zinc-500">
            {requireFollow
              ? "Sent once they follow you."
              : "Sent as a DM right after their comment."}{" "}
            Placeholders: @username is the commenter, {"{account}"} is your
            handle.
          </p>
        )}
      </div>
      {!rail ? (
        <div className="space-y-2">
          <Label htmlFor="comment-reply">Comment reply</Label>
          <Textarea
            id="comment-reply"
            {...form.register("commentReplyMessage")}
          />
        </div>
      ) : null}
    </>
  );

  const body = (
    <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
      {wizard ? (
        rail ? (
          <div className="flex items-center gap-2">
            {labels.map((label, index) => (
              <span
                key={label}
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold",
                  index === step
                    ? "bg-violet-600 text-white"
                    : index < step
                      ? "bg-violet-600/40 text-white"
                      : "bg-zinc-800 text-zinc-500",
                )}
                title={label}
              >
                {index + 1}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs uppercase tracking-[0.18em] text-violet-300">
            Step {step + 1} of 4 · {labels[step]}
          </p>
        )
      ) : null}

      {rail && wizard ? (
        <p className="text-sm font-medium text-white">
          {step + 1}. {labels[step]}
        </p>
      ) : null}

      {(!wizard || (!rail && step === 0) || (rail && wizard && step === 0)) &&
      accounts.length > 1 ? (
        <div className="space-y-2">
          <Label>Instagram account</Label>
          <Controller
            control={form.control}
            name="instagramAccountId"
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={(next) => {
                  field.onChange(next);
                  form.setValue("mediaId", "");
                  setSelectedMedia(null);
                }}
                options={accounts.map((item) => ({
                  value: item.id,
                  label: `@${item.username}`,
                }))}
              />
            )}
          />
        </div>
      ) : null}

      {(!wizard || (!rail && step === 1) || (rail && wizard && step === 0)) && (
        <div className="space-y-2">
          {!rail ? <Label>Post or reel</Label> : null}
          <Controller
            control={form.control}
            name="mediaId"
            render={({ field }) => (
              <MediaPicker
                accountId={accountId}
                value={field.value}
                onChange={field.onChange}
                onSelected={setSelectedMedia}
                compact={rail}
              />
            )}
          />
        </div>
      )}

      {(!wizard || (!rail && step === 2) || (rail && wizard && step === 1)) &&
        (rail ? keywordEditor : settingsFields)}

      {rail && wizard && step === 2 ? (
        <div className="space-y-2">
          <Label htmlFor="message">Private Reply Message</Label>
          <Textarea
            id="message"
            rows={6}
            {...form.register("privateReplyMessage")}
          />
          <p className="text-right text-[11px] text-zinc-500">
            {message.length} characters
          </p>
        </div>
      ) : null}

      {rail && wizard && step === 3 ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-xl border border-zinc-800 px-4 py-3">
            <div>
              <p className="text-sm text-white">Enable automation</p>
              <p className="text-xs text-zinc-500">
                Automatically reply to matching comments
              </p>
            </div>
            <Controller
              control={form.control}
              name="enabled"
              render={({ field }) => (
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
          </div>
          <div className="flex items-center justify-between rounded-xl border border-zinc-800 px-4 py-3">
            <div>
              <p className="text-sm text-white">Match exact keyword first</p>
              <p className="text-xs text-zinc-500">
                If multiple keywords match, use exact match.
              </p>
            </div>
            <Controller
              control={form.control}
              name="matchType"
              render={({ field }) => (
                <Switch
                  checked={field.value === "exact"}
                  onCheckedChange={(checked) =>
                    field.onChange(checked ? "exact" : "contains")
                  }
                />
              )}
            />
          </div>
          <div className="flex items-center justify-between rounded-xl border border-zinc-800 px-4 py-3">
            <div>
              <p className="text-sm text-white">Only if they follow</p>
              <p className="text-xs text-zinc-500">
                Existing followers get the link immediately.
              </p>
            </div>
            <Controller
              control={form.control}
              name="requireFollow"
              render={({ field }) => (
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
          </div>
          <p className="text-xs text-zinc-500">
            @{account?.username} · {keywords.join(", ")} ·{" "}
            {enabled ? "On" : "Off"} · {matchType}
          </p>
        </div>
      ) : null}

      {wizard && !rail && step === 3 ? (
        <div className="space-y-2 rounded-2xl border border-zinc-800 p-4 text-sm">
          <p className="text-zinc-400">Instagram account</p>
          <p className="text-white">@{account?.username}</p>
          <p className="mt-3 text-zinc-400">Selected reel or post</p>
          <p className="text-white">{selectedMedia?.caption || "Untitled"}</p>
          <p className="mt-3 text-zinc-400">Keywords</p>
          <p className="text-white">{keywords.join(", ")}</p>
          <p className="mt-3 text-zinc-400">Private reply</p>
          <p className="text-white">{message}</p>
          <p className="mt-3 text-zinc-400">Follow required</p>
          <p className="text-white">{requireFollow ? "Yes" : "No"}</p>
          <p className="mt-3 text-zinc-400">Comment reply</p>
          <p className="text-white">{commentReply || "None"}</p>
          <p className="text-xs text-zinc-500">{automationName}</p>
        </div>
      ) : null}

      <div className="flex gap-3">
        {wizard && step > 0 ? (
          <Button
            type="button"
            variant="secondary"
            onClick={() => setStep((current) => current - 1)}
          >
            Back
          </Button>
        ) : null}
        {wizard && step < 3 ? (
          <Button type="button" className="flex-1" onClick={goNext}>
            Continue
          </Button>
        ) : (
          <Button
            type="submit"
            className="flex-1"
            disabled={form.formState.isSubmitting}
          >
            {initial ? "Save changes" : "Create Automation →"}
          </Button>
        )}
      </div>
    </form>
  );

  if (rail) {
    return (
      <aside className="w-full shrink-0 rounded-3xl border border-white/10 bg-zinc-950/80 p-5 xl:w-[360px]">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">
              Create Automation
            </h2>
          </div>
          {onClose ? (
            <button
              type="button"
              className="text-zinc-500 hover:text-white"
              onClick={onClose}
            >
              ×
            </button>
          ) : null}
        </div>
        {body}
      </aside>
    );
  }

  return (
    <Card>
      <CardContent className="space-y-5 pt-6">{body}</CardContent>
    </Card>
  );
}
