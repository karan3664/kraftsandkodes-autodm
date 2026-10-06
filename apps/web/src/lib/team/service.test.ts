import { beforeEach, describe, expect, it, vi } from "vitest";
import { hashToken } from "@kdl/shared/crypto";
import { TEAM_LIMIT_MESSAGE } from "../plans";

const teamMember = {
  findMany: vi.fn(),
  findFirst: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  count: vi.fn(),
};
const instagramAccount = { findMany: vi.fn(), findFirst: vi.fn() };
const teamMemberAccount = { deleteMany: vi.fn(), createMany: vi.fn() };
const sendMail = vi.fn();

vi.mock("@kdl/db", () => ({
  prisma: {
    teamMember,
    instagramAccount,
    teamMemberAccount,
    $queryRaw: vi.fn(),
    $transaction: async (fn: (tx: unknown) => unknown) =>
      typeof fn === "function"
        ? fn({
            teamMember,
            $queryRaw: vi.fn(),
          })
        : Promise.all(fn as never),
  },
}));

vi.mock("../mail", () => ({
  sendMail: (...args: unknown[]) => sendMail(...args),
}));

const ownerWs = {
  actor: { id: "owner", email: "owner@x.com", name: "Karan" },
  ownerUserId: "owner",
  ownerName: "Karan",
  ownerPlan: "agency" as const,
  role: "owner" as const,
  teamLive: true,
  leftoverTeam: false,
  assignedAccountIds: null,
  canBilling: true,
  canTeam: true,
  canManageIg: true,
  canAssignAccounts: true,
};

describe("team service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sendMail.mockResolvedValue({ sent: true });
    teamMember.findFirst.mockResolvedValue(null);
    teamMember.count.mockResolvedValue(0);
    teamMember.create.mockImplementation(
      async ({ data }: { data: object }) => ({
        id: "tm_1",
        ...data,
      }),
    );
  });

  it("rejects a fourth Agency seat", async () => {
    teamMember.count.mockResolvedValue(2);
    const { inviteMember } = await import("./service");
    await expect(
      inviteMember(ownerWs, { email: "four@x.com", role: "member" }),
    ).rejects.toMatchObject({
      code: "PLAN_TEAM_LIMIT",
      message: TEAM_LIMIT_MESSAGE,
    } satisfies Partial<{ code: string; message: string }>);
  });

  it("rejects invites off Agency", async () => {
    const { inviteMember } = await import("./service");
    await expect(
      inviteMember(
        { ...ownerWs, ownerPlan: "pro", teamLive: false },
        { email: "a@x.com", role: "member" },
      ),
    ).rejects.toMatchObject({ code: "PLAN_TEAM_REQUIRED" });
  });

  it("rejects duplicate invitations", async () => {
    teamMember.findFirst.mockResolvedValue({ id: "tm_dup" });
    const { inviteMember } = await import("./service");
    await expect(
      inviteMember(ownerWs, { email: "dup@x.com", role: "member" }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("lets owner invite the second and third seats", async () => {
    teamMember.count.mockResolvedValue(0);
    const { inviteMember } = await import("./service");
    const first = await inviteMember(ownerWs, {
      email: "two@x.com",
      role: "member",
    });
    expect(first.email).toBe("two@x.com");
    teamMember.count.mockResolvedValue(1);
    const second = await inviteMember(ownerWs, {
      email: "three@x.com",
      role: "admin",
    });
    expect(second.role).toBe("admin");
    expect(sendMail).toHaveBeenCalledTimes(2);
  });

  it("rejects a member managing the team", async () => {
    const { inviteMember, removeMember, changeRole } =
      await import("./service");
    const memberWs = {
      ...ownerWs,
      role: "member" as const,
      canTeam: false,
      canBilling: false,
    };
    await expect(
      inviteMember(memberWs, { email: "x@x.com", role: "member" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(removeMember(memberWs, "tm_1")).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(changeRole(memberWs, "tm_1", "admin")).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("cancels and removes members", async () => {
    teamMember.findFirst.mockResolvedValue({
      id: "tm_1",
      ownerUserId: "owner",
      status: "pending",
    });
    const { cancelInvite, removeMember } = await import("./service");
    await expect(cancelInvite(ownerWs, "tm_1")).resolves.toEqual({
      id: "tm_1",
      status: "cancelled",
    });
    teamMember.findFirst.mockResolvedValue({
      id: "tm_2",
      ownerUserId: "owner",
    });
    await expect(removeMember(ownerWs, "tm_2")).resolves.toEqual({
      id: "tm_2",
      removed: true,
    });
  });

  it("changes role", async () => {
    teamMember.findFirst.mockResolvedValue({
      id: "tm_1",
      ownerUserId: "owner",
      status: "accepted",
    });
    const { changeRole } = await import("./service");
    await expect(changeRole(ownerWs, "tm_1", "admin")).resolves.toEqual({
      id: "tm_1",
      role: "admin",
    });
  });

  it("rejects expired and wrong-email accepts", async () => {
    const token = "a".repeat(64);
    teamMember.findFirst.mockResolvedValue({
      id: "tm_1",
      email: "invited@x.com",
      inviteExpiresAt: new Date("2020-01-01"),
      owner: {
        id: "owner",
        plan: "agency",
        planExpiresAt: new Date("2030-01-01"),
      },
    });
    const { acceptInvite } = await import("./service");
    await expect(
      acceptInvite(token, { id: "u2", email: "invited@x.com" }),
    ).rejects.toMatchObject({ code: "EXPIRED" });

    teamMember.findFirst.mockResolvedValue({
      id: "tm_1",
      email: "invited@x.com",
      inviteExpiresAt: new Date("2030-01-01"),
      owner: {
        id: "owner",
        plan: "agency",
        planExpiresAt: new Date("2030-01-01"),
      },
    });
    await expect(
      acceptInvite(token, { id: "u2", email: "other@x.com" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("accepts the matching email", async () => {
    const token = "b".repeat(64);
    teamMember.findFirst.mockResolvedValue({
      id: "tm_1",
      email: "invited@x.com",
      ownerUserId: "owner",
      inviteExpiresAt: new Date("2030-01-01"),
      owner: {
        id: "owner",
        plan: "agency",
        planExpiresAt: new Date("2030-01-01"),
      },
    });
    teamMember.update.mockResolvedValue({});
    const { acceptInvite } = await import("./service");
    await expect(
      acceptInvite(token, { id: "u2", email: "invited@x.com" }),
    ).resolves.toEqual({ ownerUserId: "owner" });
    expect(hashToken(token)).toHaveLength(64);
  });

  it("blocks assigning another workspace Instagram account", async () => {
    teamMember.findFirst.mockResolvedValue({
      id: "tm_1",
      ownerUserId: "owner",
      status: "accepted",
    });
    instagramAccount.findMany.mockResolvedValue([{ id: "ig_1" }]);
    const { assignAccounts } = await import("./service");
    await expect(
      assignAccounts(ownerWs, "tm_1", ["ig_1", "ig_stolen"]),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
