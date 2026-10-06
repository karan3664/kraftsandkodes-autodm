import { prisma } from "@kdl/db";
import { cookies } from "next/headers";
import { requireUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import {
  getConnectedInstagramProfile,
  getInstagramStatus,
} from "@/lib/instagram";
import { toMediaPickerItem } from "@/lib/instagram-media";
import {
  activityHistorySince,
  getEffectivePlan,
  INSTAGRAM_ACCOUNT_LIMIT_MESSAGE,
} from "@/lib/plans";
import { isAdmin } from "@/lib/auth/admin";
import {
  canConnectAnotherAccount,
  resolveWorkspaceInstagramAccount,
} from "@/lib/instagram-selection";
import { INSTAGRAM_OAUTH_STATE_COOKIE } from "@/lib/instagram-oauth-url";
import { loadWorkspace } from "@/lib/team/workspace";
import { InstagramWorkspace } from "./instagram-workspace";

export default async function InstagramPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await requireUser();
  if (!user) {
    redirect("/auth/login");
  }

  const params = await searchParams;
  const jar = await cookies();
  const oauthPending = Boolean(jar.get(INSTAGRAM_OAUTH_STATE_COOKIE)?.value);
  const status = getInstagramStatus();
  const ws = await loadWorkspace(user);
  const { selected: account } = await resolveWorkspaceInstagramAccount(ws);
  const [dbUser, connectQuota] = await Promise.all([
    prisma.user.findUnique({
      where: { id: ws.ownerUserId },
      select: { plan: true, planExpiresAt: true },
    }),
    canConnectAnotherAccount(ws.ownerUserId),
  ]);
  const since = activityHistorySince(
    getEffectivePlan(dbUser ?? {}),
    new Date(),
    isAdmin(user),
  );

  const [media, automations, executions, profile] = account
    ? await Promise.all([
        prisma.instagramMedia.findMany({
          where: { instagramAccountId: account.id },
          orderBy: { publishedAt: "desc" },
        }),
        prisma.automation.findMany({
          where: { instagramAccountId: account.id },
          include: { keywords: true },
        }),
        prisma.automationExecution.findMany({
          where: {
            instagramAccountId: account.id,
            ...(since ? { createdAt: { gte: since } } : {}),
          },
          include: { automation: { include: { media: true } } },
          orderBy: { createdAt: "desc" },
          take: 80,
        }),
        getConnectedInstagramProfile(account.accessTokenEncrypted),
      ])
    : [[], [], [], null];

  return (
    <InstagramWorkspace
      account={
        account
          ? {
              id: account.id,
              username: account.username,
              instagramUserId: account.instagramUserId,
              profilePictureUrl: account.profilePictureUrl,
              connectedAt: account.connectedAt.toISOString(),
              webhookStatus: account.webhookStatus,
              webhookError: account.webhookError,
              followersCount: profile?.followersCount ?? null,
              followsCount: profile?.followsCount ?? null,
              mediaCount: profile?.mediaCount ?? null,
              name: profile?.name ?? null,
              accountType: profile?.accountType ?? null,
              biography: profile?.biography ?? null,
              website: profile?.website ?? null,
            }
          : null
      }
      media={media.map(toMediaPickerItem)}
      automations={automations.map((item) => ({
        id: item.id,
        name: item.name,
        enabled: item.enabled,
        mediaId: item.mediaId,
        keywords: item.keywords.map((keyword) => keyword.keyword),
        privateReplyMessage: item.privateReplyMessage,
      }))}
      comments={executions.map((item) => ({
        id: item.id,
        commentText: item.commentText,
        commenterUsername: item.commenterUsername,
        matchedKeyword: item.matchedKeyword,
        status: item.status,
        createdAt: item.createdAt.toISOString(),
        mediaId: item.automation.mediaId,
        automationName: item.automation.name,
        mediaCaption: item.automation.media.caption,
        mediaType: item.automation.media.mediaType,
        thumbnailUrl: item.automation.media.thumbnailUrl,
      }))}
      oauthError={
        params.error && params.error !== "account_limit"
          ? oauthErrorMessage(params.error)
          : null
      }
      oauthPending={oauthPending && !account}
      accountLimit={params.error === "account_limit" || !connectQuota.ok}
      canAddAccount={ws.canManageIg && connectQuota.ok}
      canConnect={status.configured || status.mock}
      mock={status.mock}
      configured={status.configured}
    />
  );
}

function oauthErrorMessage(error: string) {
  if (error === "oauth_denied") {
    return "Instagram access was cancelled before Allow. Continue connecting and tap Allow.";
  }
  if (error === "oauth_state") {
    return "That Instagram session expired. Continue connecting, then tap Allow once — do not refresh the Allow page.";
  }
  if (error === "oauth_code") {
    return "That Instagram Allow link was already used. Tap Continue connecting again, then Allow once (do not refresh).";
  }
  if (error === "oauth_redirect") {
    return "Instagram redirect URL mismatch. Meta app Valid OAuth Redirect URIs must include https://app.kraftsandkodes.com/api/instagram/callback";
  }
  if (error === "oauth_permission") {
    return "Instagram did not grant the required permissions. On Allow, keep comments and messages access enabled.";
  }
  if (error === "oauth_account_type") {
    return "Use a Creator or Business Instagram account (not a personal profile), then tap Allow.";
  }
  if (error === "oauth_tester") {
    return "Meta blocked this Instagram account (app still in Development / not a tester). In Meta App → Roles → Instagram Testers, add that @username, accept the invite on Instagram, then Connect again. For all users you need Live app + App Review.";
  }
  if (error === "already_linked") {
    return "That Instagram account is already connected to another user.";
  }
  if (error === "account_limit") {
    return INSTAGRAM_ACCOUNT_LIMIT_MESSAGE;
  }
  return "Instagram connection failed after Allow. Tap Continue connecting once more — if it still fails, the Meta app may be in Development mode and this Instagram user must be added as a tester.";
}
