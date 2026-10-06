import { prisma } from "@kdl/db";
import { DEFAULT_MESSAGES } from "@kdl/shared";
import { requireUser } from "@/lib/auth/session";
import { loadWorkspace } from "@/lib/team/workspace";
import { notFound, redirect } from "next/navigation";
import { CreateAutomationWizard } from "../create-wizard";

export default async function EditAutomationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  if (!user) {
    redirect("/auth/login");
  }

  const ws = await loadWorkspace(user);
  const { id } = await params;
  const [automation, accounts] = await Promise.all([
    prisma.automation.findFirst({
      where: { id, userId: ws.ownerUserId },
      include: { keywords: true, media: true },
    }),
    prisma.instagramAccount.findMany({
      where: {
        userId: ws.ownerUserId,
        ...(ws.assignedAccountIds ? { id: { in: ws.assignedAccountIds } } : {}),
      },
    }),
  ]);

  if (
    !automation ||
    (ws.assignedAccountIds &&
      !ws.assignedAccountIds.includes(automation.instagramAccountId))
  ) {
    notFound();
  }

  const matchType =
    automation.matchType === "all_comments" ||
    (automation.keywords.length === 1 &&
      automation.keywords[0]?.keyword === "*")
      ? "all_comments"
      : automation.matchType === "exact"
        ? "exact"
        : "contains";

  return (
    <CreateAutomationWizard
      accounts={accounts.map((account) => ({
        id: account.id,
        username: account.username,
      }))}
      selectedAccountId={automation.instagramAccountId}
      initial={{
        id: automation.id,
        keywords:
          matchType === "all_comments"
            ? []
            : automation.keywords.map((item) => item.keyword),
        matchType,
        actionType: automation.actionType,
        privateReplyMessage: automation.privateReplyMessage,
        requireFollow: automation.requireFollow,
        followPromptMessage:
          automation.followPromptMessage ?? DEFAULT_MESSAGES.followPrompt,
        notFollowingMessage:
          automation.notFollowingMessage ?? DEFAULT_MESSAGES.notFollowing,
        commentReplyMessage: automation.commentReplyMessage ?? "",
        ignoreOwnComments: automation.ignoreOwnComments,
        enabled: automation.enabled,
        instagramAccountId: automation.instagramAccountId,
        mediaId: automation.mediaId,
        media: {
          id: automation.media.id,
          instagramMediaId: automation.media.instagramMediaId,
          mediaType: automation.media.mediaType,
          caption: automation.media.caption,
          thumbnailUrl: automation.media.thumbnailUrl,
          permalink: automation.media.permalink,
          publishedAt: automation.media.publishedAt?.toISOString() ?? null,
          likeCount: automation.media.likeCount,
          commentsCount: automation.media.commentsCount,
          commentsEnabled: automation.media.commentsEnabled,
        },
      }}
    />
  );
}
