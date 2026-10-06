import { prisma } from "@kdl/db";
import { DEFAULT_MESSAGES } from "@kdl/shared";
import { requireUser } from "@/lib/auth/session";
import { loadWorkspace } from "@/lib/team/workspace";
import { notFound, redirect } from "next/navigation";
import { AutomationForm } from "../form";

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
      include: { keywords: true },
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

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-white">Edit automation</h1>
        <p className="mt-2 text-zinc-400">
          Update keyword matching and the private reply.
        </p>
      </div>
      <AutomationForm
        accounts={accounts.map((account) => ({
          id: account.id,
          username: account.username,
        }))}
        initial={{
          id: automation.id,
          name: automation.name,
          keywords:
            automation.keywords.length === 1 &&
            automation.keywords[0]?.keyword === "*"
              ? []
              : automation.keywords.map((item) => item.keyword),
          matchType:
            automation.matchType === "all_comments" ||
            (automation.keywords.length === 1 &&
              automation.keywords[0]?.keyword === "*")
              ? "all_comments"
              : automation.matchType === "exact"
                ? "exact"
                : "contains",
          caseSensitive: automation.caseSensitive,
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
        }}
      />
    </div>
  );
}
