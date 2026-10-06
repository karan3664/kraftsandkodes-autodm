import { prisma } from "@kdl/db";
import { requireUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth/admin";
import { resolveWorkspaceInstagramAccount } from "@/lib/instagram-selection";
import { loadWorkspace } from "@/lib/team/workspace";
import { activityHistorySince, getEffectivePlan } from "@/lib/plans";
import { ActivityWorkspace } from "./activity-workspace";

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await requireUser();
  if (!user) {
    redirect("/auth/login");
  }

  const ws = await loadWorkspace(user);
  const { selected } = await resolveWorkspaceInstagramAccount(ws);
  const params = await searchParams;
  const dbUser = await prisma.user.findUnique({
    where: { id: ws.ownerUserId },
    select: { plan: true, planExpiresAt: true },
  });
  const since = activityHistorySince(
    getEffectivePlan(dbUser ?? {}),
    new Date(),
    isAdmin(user),
  );
  const [rows, automations, accounts] = await Promise.all([
    prisma.automationExecution.findMany({
      where: {
        ...(selected
          ? { instagramAccountId: selected.id }
          : { instagramAccount: { userId: ws.ownerUserId } }),
        ...(ws.assignedAccountIds
          ? { instagramAccountId: { in: ws.assignedAccountIds } }
          : {}),
        ...(since ? { createdAt: { gte: since } } : {}),
      },
      include: {
        automation: {
          include: {
            media: true,
            instagramAccount: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    }),
    prisma.automation.findMany({
      where: {
        userId: ws.ownerUserId,
        ...(ws.assignedAccountIds
          ? { instagramAccountId: { in: ws.assignedAccountIds } }
          : {}),
      },
      select: { id: true, name: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.instagramAccount.findMany({
      where: {
        userId: ws.ownerUserId,
        ...(ws.assignedAccountIds ? { id: { in: ws.assignedAccountIds } } : {}),
      },
      select: { id: true, username: true },
    }),
  ]);

  return (
    <ActivityWorkspace
      initialQuery={params.q ?? ""}
      automations={automations}
      accounts={accounts}
      rows={rows.map((row) => ({
        id: row.id,
        commentText: row.commentText,
        commenterUsername: row.commenterUsername,
        matchedKeyword: row.matchedKeyword,
        status: row.status,
        errorMessage: row.errorMessage,
        errorCode: row.errorCode,
        messageText: row.messageText,
        createdAt: row.createdAt.toISOString(),
        automationId: row.automationId,
        automationName: row.automation.name,
        accountId: row.instagramAccountId,
        accountUsername: row.automation.instagramAccount.username,
        mediaCaption: row.automation.media.caption,
        mediaType: row.automation.media.mediaType,
        thumbnailUrl: row.automation.media.thumbnailUrl,
      }))}
    />
  );
}
