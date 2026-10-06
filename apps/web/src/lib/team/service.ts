import {
  prisma,
  type Prisma,
  type TeamRole,
  type TeamMemberStatus,
} from "@kdl/db";
import { hashToken, randomToken } from "@kdl/shared/crypto";
import { sendMail } from "../mail";
import { APP_ORIGIN } from "../hosts";
import { TEAM_LIMIT_MESSAGE, teamMemberLimit } from "../plans";
import { buildTeamInviteEmail } from "./invite-email";
import {
  INVITE_TTL_MS,
  canAddTeamSeat,
  emailsMatch,
  normalizeEmail,
  teamPlanLive,
  teamSeatsUsed,
} from "./logic";
import { type Workspace } from "./workspace";

export class TeamError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "TeamError";
  }
}

const ACTIVE: TeamMemberStatus[] = ["pending", "accepted"];

async function countActiveSeats(
  tx: Prisma.TransactionClient | typeof prisma,
  ownerUserId: string,
): Promise<number> {
  const rows = await tx.teamMember.count({
    where: { ownerUserId, status: { in: ACTIVE } },
  });
  return teamSeatsUsed(rows);
}

function requireOwner(ws: Workspace) {
  if (ws.role !== "owner" || !ws.canTeam) {
    throw new TeamError(
      "FORBIDDEN",
      "Only the workspace owner can manage the team.",
    );
  }
}

export async function listTeam(ws: Workspace) {
  const members = await prisma.teamMember.findMany({
    where: { ownerUserId: ws.ownerUserId },
    include: {
      member: { select: { name: true, email: true } },
      accounts: { select: { instagramAccountId: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  const used = teamSeatsUsed(
    members.filter((row) => ACTIVE.includes(row.status)).length,
  );
  const limit = teamMemberLimit(ws.ownerPlan);
  return {
    owner: {
      id: ws.ownerUserId,
      name: ws.ownerName,
      role: "owner" as const,
      status: "accepted" as const,
    },
    members: members.map((row) => ({
      id: row.id,
      email: row.email,
      name: row.member?.name ?? null,
      role: row.role,
      status: row.status,
      accountIds: row.accounts.map((item) => item.instagramAccountId),
      inviteExpiresAt: row.inviteExpiresAt?.toISOString() ?? null,
    })),
    used,
    limit,
    teamLive: ws.teamLive,
    leftoverTeam: ws.leftoverTeam,
    canInvite: ws.canTeam && canAddTeamSeat(ws.ownerPlan, used),
  };
}

export async function inviteMember(
  ws: Workspace,
  input: { email: string; role: "admin" | "member" },
) {
  requireOwner(ws);
  if (!ws.teamLive) {
    throw new TeamError(
      "PLAN_TEAM_REQUIRED",
      "Team members are available on the Agency plan.",
    );
  }
  const email = normalizeEmail(input.email);
  if (!email || !email.includes("@")) {
    throw new TeamError("VALIDATION_ERROR", "Enter a valid email.");
  }
  if (emailsMatch(email, ws.actor.email)) {
    throw new TeamError("VALIDATION_ERROR", "You already own this workspace.");
  }
  const role: TeamRole = input.role === "admin" ? "admin" : "member";
  const token = randomToken(32);
  const inviteTokenHash = hashToken(token);
  const inviteExpiresAt = new Date(Date.now() + INVITE_TTL_MS);

  const member = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${ws.ownerUserId} FOR UPDATE`;
    const used = await countActiveSeats(tx, ws.ownerUserId);
    if (!canAddTeamSeat(ws.ownerPlan, used)) {
      throw new TeamError("PLAN_TEAM_LIMIT", TEAM_LIMIT_MESSAGE);
    }
    const duplicate = await tx.teamMember.findFirst({
      where: {
        ownerUserId: ws.ownerUserId,
        email,
        status: { in: ACTIVE },
      },
    });
    if (duplicate) {
      throw new TeamError(
        "VALIDATION_ERROR",
        "That email is already invited or on the team.",
      );
    }
    return tx.teamMember.create({
      data: {
        ownerUserId: ws.ownerUserId,
        email,
        role,
        status: "pending",
        inviteTokenHash,
        inviteExpiresAt,
      },
    });
  });

  const inviteUrl = `${APP_ORIGIN}/invite/${token}`;
  const mail = buildTeamInviteEmail({
    inviteeEmail: email,
    ownerName: ws.ownerName,
    role,
    inviteUrl,
    expiresAt: inviteExpiresAt,
  });
  const sent = await sendMail({ to: email, ...mail });
  if (!sent.sent) {
    await prisma.teamMember.update({
      where: { id: member.id },
      data: { inviteTokenHash: null, status: "cancelled" },
    });
    throw new TeamError(
      "MAIL_FAILED",
      sent.error ?? "Could not send the invitation email.",
    );
  }
  return { id: member.id, email, role, status: "pending" as const };
}

export async function resendInvite(ws: Workspace, memberId: string) {
  requireOwner(ws);
  if (!ws.teamLive) {
    throw new TeamError(
      "PLAN_TEAM_REQUIRED",
      "Team members are available on the Agency plan.",
    );
  }
  const row = await prisma.teamMember.findFirst({
    where: { id: memberId, ownerUserId: ws.ownerUserId, status: "pending" },
  });
  if (!row) {
    throw new TeamError("NOT_FOUND", "Invitation not found.");
  }
  const token = randomToken(32);
  const inviteExpiresAt = new Date(Date.now() + INVITE_TTL_MS);
  await prisma.teamMember.update({
    where: { id: row.id },
    data: { inviteTokenHash: hashToken(token), inviteExpiresAt },
  });
  const mail = buildTeamInviteEmail({
    inviteeEmail: row.email,
    ownerName: ws.ownerName,
    role: row.role,
    inviteUrl: `${APP_ORIGIN}/invite/${token}`,
    expiresAt: inviteExpiresAt,
  });
  const sent = await sendMail({ to: row.email, ...mail });
  if (!sent.sent) {
    throw new TeamError(
      "MAIL_FAILED",
      sent.error ?? "Could not send the invitation email.",
    );
  }
  return { id: row.id, email: row.email };
}

export async function cancelInvite(ws: Workspace, memberId: string) {
  requireOwner(ws);
  const row = await prisma.teamMember.findFirst({
    where: { id: memberId, ownerUserId: ws.ownerUserId, status: "pending" },
  });
  if (!row) {
    throw new TeamError("NOT_FOUND", "Invitation not found.");
  }
  await prisma.teamMember.update({
    where: { id: row.id },
    data: { status: "cancelled", inviteTokenHash: null },
  });
  return { id: row.id, status: "cancelled" as const };
}

export async function changeRole(
  ws: Workspace,
  memberId: string,
  role: "admin" | "member",
) {
  requireOwner(ws);
  const row = await prisma.teamMember.findFirst({
    where: {
      id: memberId,
      ownerUserId: ws.ownerUserId,
      status: { in: ACTIVE },
    },
  });
  if (!row) {
    throw new TeamError("NOT_FOUND", "Team member not found.");
  }
  const next: TeamRole = role === "admin" ? "admin" : "member";
  await prisma.teamMember.update({
    where: { id: row.id },
    data: { role: next },
  });
  return { id: row.id, role: next };
}

export async function removeMember(ws: Workspace, memberId: string) {
  requireOwner(ws);
  const row = await prisma.teamMember.findFirst({
    where: { id: memberId, ownerUserId: ws.ownerUserId },
  });
  if (!row) {
    throw new TeamError("NOT_FOUND", "Team member not found.");
  }
  await prisma.teamMember.delete({ where: { id: row.id } });
  return { id: row.id, removed: true };
}

export async function assignAccounts(
  ws: Workspace,
  memberId: string,
  accountIds: string[],
) {
  if (!ws.canAssignAccounts) {
    throw new TeamError(
      "FORBIDDEN",
      "Only the owner or an admin can assign Instagram accounts.",
    );
  }
  const row = await prisma.teamMember.findFirst({
    where: {
      id: memberId,
      ownerUserId: ws.ownerUserId,
      status: { in: ACTIVE },
    },
  });
  if (!row) {
    throw new TeamError("NOT_FOUND", "Team member not found.");
  }
  const unique = [...new Set(accountIds)];
  if (unique.length > 0) {
    const owned = await prisma.instagramAccount.findMany({
      where: {
        userId: ws.ownerUserId,
        disconnectedAt: null,
        id: { in: unique },
      },
      select: { id: true },
    });
    if (owned.length !== unique.length) {
      throw new TeamError(
        "FORBIDDEN",
        "Assign only Instagram accounts in this workspace.",
      );
    }
  }
  await prisma.$transaction([
    prisma.teamMemberAccount.deleteMany({ where: { teamMemberId: row.id } }),
    ...(unique.length
      ? [
          prisma.teamMemberAccount.createMany({
            data: unique.map((instagramAccountId) => ({
              teamMemberId: row.id,
              instagramAccountId,
            })),
          }),
        ]
      : []),
  ]);
  return { id: row.id, accountIds: unique };
}

export async function previewInvite(token: string) {
  const row = await prisma.teamMember.findFirst({
    where: { inviteTokenHash: hashToken(token), status: "pending" },
    include: {
      owner: { select: { name: true, plan: true, planExpiresAt: true } },
    },
  });
  if (!row) {
    throw new TeamError("NOT_FOUND", "This invitation is not valid.");
  }
  if (
    !teamPlanLive(row.owner) ||
    !row.inviteExpiresAt ||
    row.inviteExpiresAt <= new Date()
  ) {
    throw new TeamError("EXPIRED", "This invitation has expired.");
  }
  return {
    email: row.email,
    role: row.role,
    ownerName: row.owner.name,
    expiresAt: row.inviteExpiresAt.toISOString(),
  };
}

export async function acceptInvite(
  token: string,
  user: { id: string; email: string },
) {
  const hash = hashToken(token);
  return prisma.$transaction(async (tx) => {
    const row = await tx.teamMember.findFirst({
      where: { inviteTokenHash: hash, status: "pending" },
      include: {
        owner: { select: { id: true, plan: true, planExpiresAt: true } },
      },
    });
    if (!row) {
      throw new TeamError("NOT_FOUND", "This invitation is not valid.");
    }
    if (!teamPlanLive(row.owner)) {
      throw new TeamError(
        "PLAN_TEAM_REQUIRED",
        "This workspace is not on the Agency plan.",
      );
    }
    if (!row.inviteExpiresAt || row.inviteExpiresAt <= new Date()) {
      throw new TeamError("EXPIRED", "This invitation has expired.");
    }
    if (!emailsMatch(user.email, row.email)) {
      throw new TeamError(
        "FORBIDDEN",
        "Sign in with the invited email to accept this invitation.",
      );
    }
    await tx.teamMember.update({
      where: { id: row.id },
      data: {
        status: "accepted",
        memberUserId: user.id,
        acceptedAt: new Date(),
        inviteTokenHash: null,
      },
    });
    return { ownerUserId: row.ownerUserId };
  });
}

export async function declineInvite(token: string, email?: string) {
  const row = await prisma.teamMember.findFirst({
    where: { inviteTokenHash: hashToken(token), status: "pending" },
  });
  if (!row) {
    throw new TeamError("NOT_FOUND", "This invitation is not valid.");
  }
  if (email && !emailsMatch(email, row.email)) {
    throw new TeamError(
      "FORBIDDEN",
      "This invitation is for a different email.",
    );
  }
  await prisma.teamMember.update({
    where: { id: row.id },
    data: { status: "declined", inviteTokenHash: null },
  });
  return { declined: true };
}
