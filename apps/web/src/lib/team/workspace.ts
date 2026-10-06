import { prisma, type Prisma } from "@kdl/db";
import { getEffectivePlan } from "../plans";
import { type TeamRoleName } from "./logic";

export type Workspace = {
  actor: { id: string; email: string; name: string };
  ownerUserId: string;
  ownerName: string;
  ownerPlan: ReturnType<typeof getEffectivePlan>;
  role: TeamRoleName;
  teamLive: boolean;
  leftoverTeam: boolean;
  assignedAccountIds: string[] | null;
  canBilling: boolean;
  canTeam: boolean;
  canManageIg: boolean;
  canAssignAccounts: boolean;
};

export function accountWhere(ws: Workspace): Prisma.InstagramAccountWhereInput {
  if (ws.assignedAccountIds) {
    return {
      userId: ws.ownerUserId,
      id: { in: ws.assignedAccountIds },
    };
  }
  return { userId: ws.ownerUserId };
}

export function automationWhere(ws: Workspace): Prisma.AutomationWhereInput {
  if (ws.assignedAccountIds) {
    return {
      userId: ws.ownerUserId,
      instagramAccountId: { in: ws.assignedAccountIds },
    };
  }
  return { userId: ws.ownerUserId };
}

export function executionWhere(
  ws: Workspace,
): Prisma.AutomationExecutionWhereInput {
  if (ws.assignedAccountIds) {
    return { instagramAccountId: { in: ws.assignedAccountIds } };
  }
  return { instagramAccount: { userId: ws.ownerUserId } };
}

export async function loadWorkspace(user: {
  id: string;
  email: string;
  name: string;
}): Promise<Workspace> {
  const membership = await prisma.teamMember.findFirst({
    where: {
      memberUserId: user.id,
      status: "accepted",
    },
    include: {
      owner: {
        select: { id: true, name: true, plan: true, planExpiresAt: true },
      },
      accounts: { select: { instagramAccountId: true } },
    },
  });

  if (membership) {
    const ownerPlan = getEffectivePlan(membership.owner);
    const teamLive = ownerPlan === "agency";
    if (teamLive) {
      const role: TeamRoleName =
        membership.role === "admin" ? "admin" : "member";
      const assigned =
        role === "member"
          ? membership.accounts.map((row) => row.instagramAccountId)
          : null;
      return {
        actor: user,
        ownerUserId: membership.ownerUserId,
        ownerName: membership.owner.name,
        ownerPlan,
        role,
        teamLive: true,
        leftoverTeam: false,
        assignedAccountIds: assigned,
        canBilling: false,
        canTeam: false,
        canManageIg: role === "admin",
        canAssignAccounts: role === "admin",
      };
    }
  }

  const owner = await prisma.user.findUnique({
    where: { id: user.id },
    select: { name: true, plan: true, planExpiresAt: true },
  });
  const ownerPlan = getEffectivePlan(owner ?? {});
  const leftoverTeam =
    ownerPlan !== "agency" &&
    (await prisma.teamMember.count({
      where: {
        ownerUserId: user.id,
        status: { in: ["pending", "accepted"] },
      },
    })) > 0;

  return {
    actor: user,
    ownerUserId: user.id,
    ownerName: owner?.name ?? user.name,
    ownerPlan,
    role: "owner",
    teamLive: ownerPlan === "agency",
    leftoverTeam,
    assignedAccountIds: null,
    canBilling: true,
    canTeam: true,
    canManageIg: true,
    canAssignAccounts: true,
  };
}

export function assertAccountId(ws: Workspace, accountId: string): boolean {
  if (!ws.assignedAccountIds) {
    return true;
  }
  return ws.assignedAccountIds.includes(accountId);
}
