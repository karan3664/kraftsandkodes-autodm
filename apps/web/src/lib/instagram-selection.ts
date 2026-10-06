import { cookies } from "next/headers";
import { prisma } from "@kdl/db";
import { isProduction } from "./env";
import { pickSelectedInstagramAccount } from "./instagram-account-pick";
import { accountLimit, canConnectAccount, getEffectivePlan } from "./plans";
import { syncExpiredPlan } from "./plan-access";
import { isAdmin } from "./auth/admin";
import { accountWhere, type Workspace } from "./team/workspace";

export const SELECTED_IG_COOKIE = "autodm_ig_account";

export type InstagramAccountRow = {
  id: string;
  username: string;
  profilePictureUrl: string | null;
  instagramUserId: string;
  accessTokenEncrypted: string;
  connectedAt: Date;
  webhookStatus: string;
  webhookError: string | null;
};

export async function listUserInstagramAccounts(userId: string) {
  return prisma.instagramAccount.findMany({
    where: { userId, disconnectedAt: null },
    orderBy: { connectedAt: "desc" },
  });
}

export async function listWorkspaceInstagramAccounts(ws: Workspace) {
  return prisma.instagramAccount.findMany({
    where: accountWhere(ws),
    orderBy: { connectedAt: "desc" },
  });
}

export async function resolveSelectedInstagramAccount(userId: string): Promise<{
  accounts: InstagramAccountRow[];
  selected: InstagramAccountRow | null;
}> {
  const accounts = await listUserInstagramAccounts(userId);
  const jar = await cookies();
  const selected = pickSelectedInstagramAccount(
    accounts,
    jar.get(SELECTED_IG_COOKIE)?.value,
  );
  return { accounts, selected };
}

export async function resolveWorkspaceInstagramAccount(ws: Workspace): Promise<{
  accounts: InstagramAccountRow[];
  selected: InstagramAccountRow | null;
}> {
  const accounts = await listWorkspaceInstagramAccounts(ws);
  const jar = await cookies();
  const selected = pickSelectedInstagramAccount(
    accounts,
    jar.get(SELECTED_IG_COOKIE)?.value,
  );
  return { accounts, selected };
}

export async function setSelectedInstagramCookie(accountId: string) {
  const jar = await cookies();
  jar.set(SELECTED_IG_COOKIE, accountId, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction(),
    path: "/",
    maxAge: 60 * 60 * 24 * 180,
  });
}

export async function canConnectAnotherAccount(userId: string): Promise<{
  ok: boolean;
  used: number;
  limit: number;
}> {
  // Count every slot ever used (including disconnected). Reconnect same IG id is free.
  const [used, user] = await Promise.all([
    prisma.instagramAccount.count({ where: { userId } }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, plan: true, planExpiresAt: true, email: true },
    }),
  ]);
  if (user && isAdmin(user)) {
    return { ok: true, used, limit: Number.POSITIVE_INFINITY };
  }
  const plan = user ? await syncExpiredPlan(user) : getEffectivePlan({});
  const limit = accountLimit(plan);
  return { ok: canConnectAccount(used, plan), used, limit };
}
