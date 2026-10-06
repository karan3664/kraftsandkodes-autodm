import { prisma } from "@kdl/db";
import { requireUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { resolveWorkspaceInstagramAccount } from "@/lib/instagram-selection";
import { loadWorkspace } from "@/lib/team/workspace";
import { AutomationsWorkspace } from "./automations-workspace";

export default async function AutomationsPage() {
  const user = await requireUser();
  if (!user) {
    redirect("/auth/login");
  }

  const ws = await loadWorkspace(user);
  const { selected } = await resolveWorkspaceInstagramAccount(ws);
  const [automations, accounts] = await Promise.all([
    prisma.automation.findMany({
      where: selected
        ? { userId: ws.ownerUserId, instagramAccountId: selected.id }
        : {
            userId: ws.ownerUserId,
            ...(ws.assignedAccountIds
              ? { instagramAccountId: { in: ws.assignedAccountIds } }
              : {}),
          },
      include: {
        instagramAccount: true,
        media: true,
        keywords: true,
        executions: { select: { status: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.instagramAccount.findMany({
      where: {
        userId: ws.ownerUserId,
        ...(ws.assignedAccountIds ? { id: { in: ws.assignedAccountIds } } : {}),
      },
      orderBy: { connectedAt: "desc" },
    }),
  ]);

  return (
    <AutomationsWorkspace
      accounts={accounts.map((account) => ({
        id: account.id,
        username: account.username,
      }))}
      items={automations.map((item) => ({
        id: item.id,
        name: item.name,
        enabled: item.enabled,
        keywords: item.keywords.map((keyword) => keyword.keyword),
        privateReplyMessage: item.privateReplyMessage,
        createdAt: item.createdAt.toISOString(),
        accountId: item.instagramAccountId,
        accountUsername: item.instagramAccount.username,
        mediaType: item.media.mediaType,
        caption: item.media.caption,
        thumbnailUrl: item.media.thumbnailUrl,
        publishedAt: item.media.publishedAt?.toISOString() ?? null,
        comments: item.executions.length,
        sent: item.executions.filter((row) => row.status === "sent").length,
      }))}
    />
  );
}
