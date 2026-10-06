import { prisma } from "@kdl/db";
import { isAdmin } from "@/lib/auth/admin";
import { requireUser } from "@/lib/auth/session";
import { getEnv } from "@/lib/env";
import { getInstagramStatus } from "@/lib/instagram";
import { mailConfigured } from "@/lib/mail";
import { getEffectivePlan } from "@/lib/plans";
import { syncExpiredPlan } from "@/lib/plan-access";
import { canConnectAnotherAccount } from "@/lib/instagram-selection";
import { razorpayConfigured } from "@/lib/razorpay";
import { accountWhere, loadWorkspace } from "@/lib/team/workspace";
import { listTeam } from "@/lib/team/service";
import { redirect } from "next/navigation";
import { SettingsWorkspace } from "./settings-workspace";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; plan?: string }>;
}) {
  const user = await requireUser();
  if (!user) {
    redirect("/auth/login");
  }
  const params = await searchParams;
  const ws = await loadWorkspace(user);

  const env = getEnv();
  const status = getInstagramStatus();
  const connectQuota = await canConnectAnotherAccount(ws.ownerUserId);
  const [accounts, dbUser, payments, team] = await Promise.all([
    prisma.instagramAccount.findMany({
      where: accountWhere(ws),
      orderBy: { connectedAt: "desc" },
      include: {
        _count: { select: { automations: true } },
      },
    }),
    prisma.user.findUnique({
      where: { id: ws.ownerUserId },
      select: { createdAt: true, plan: true, planExpiresAt: true },
    }),
    ws.canBilling
      ? prisma.payment.findMany({
          where: { userId: user.id },
          orderBy: { createdAt: "desc" },
          take: 12,
        })
      : Promise.resolve([]),
    ws.canTeam ? listTeam(ws) : Promise.resolve(null),
  ]);

  const accountIds = accounts.map((item) => item.id);
  const [mediaCount, automationCount, executionCount, sentCount] =
    accountIds.length > 0
      ? await Promise.all([
          prisma.instagramMedia.count({
            where: { instagramAccountId: { in: accountIds } },
          }),
          prisma.automation.count({
            where: { instagramAccountId: { in: accountIds } },
          }),
          prisma.automationExecution.count({
            where: { instagramAccountId: { in: accountIds } },
          }),
          prisma.automationExecution.count({
            where: { instagramAccountId: { in: accountIds }, status: "sent" },
          }),
        ])
      : [0, 0, 0, 0];

  const billingRequested =
    params.tab === "billing" ||
    params.plan === "creator" ||
    params.plan === "pro" ||
    params.plan === "agency";
  const initialTab =
    params.tab === "team" && ws.canTeam
      ? "team"
      : billingRequested && ws.canBilling
        ? "billing"
        : "general";

  return (
    <SettingsWorkspace
      admin={isAdmin(user)}
      workspaceRole={ws.role}
      canBilling={ws.canBilling}
      canTeam={ws.canTeam}
      canAddAccount={ws.canManageIg && connectQuota.ok}
      initialTab={initialTab}
      highlightPlan={
        params.plan === "creator" ||
        params.plan === "pro" ||
        params.plan === "agency"
          ? params.plan
          : null
      }
      user={{
        name: user.name,
        email: user.email,
        createdAt: dbUser?.createdAt.toISOString() ?? new Date().toISOString(),
        plan: dbUser
          ? await syncExpiredPlan({
              id: ws.ownerUserId,
              plan: dbUser.plan,
              planExpiresAt: dbUser.planExpiresAt,
            })
          : getEffectivePlan({}),
      }}
      webhookUrl={`${env.APP_URL.replace(/\/$/, "")}/api/webhooks/instagram`}
      verifyTokenConfigured={Boolean(env.META_WEBHOOK_VERIFY_TOKEN)}
      metaConfigured={status.configured}
      mock={status.mock}
      paymentsConfigured={razorpayConfigured()}
      mailConfigured={mailConfigured()}
      payments={payments.map((item) => ({
        id: item.id,
        planLabel: item.planLabel,
        amount: item.amount,
        status: item.status,
        emailStatus: item.emailStatus,
        razorpayOrderId: item.razorpayOrderId,
        razorpayPaymentId: item.razorpayPaymentId,
        failureReason: item.failureReason,
        createdAt: item.createdAt.toISOString(),
      }))}
      team={team}
      accounts={accounts.map((item) => ({
        id: item.id,
        username: item.username,
        instagramUserId: item.instagramUserId,
        profilePictureUrl: item.profilePictureUrl,
        connectedAt: item.connectedAt.toISOString(),
        webhookStatus: item.webhookStatus,
        automations: item._count.automations,
      }))}
      stats={{
        media: mediaCount,
        comments: executionCount,
        automations: automationCount,
        sent: sentCount,
      }}
    />
  );
}
