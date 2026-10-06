import { describe, expect, it } from "vitest";
import {
  canAddTeamSeat,
  emailsMatch,
  normalizeEmail,
  teamPlanLive,
  teamSeatsUsed,
} from "./logic";
import {
  accountWhere,
  automationWhere,
  executionWhere,
  type Workspace,
  assertAccountId,
} from "./workspace";

const ownerWs: Workspace = {
  actor: { id: "owner", email: "owner@x.com", name: "Owner" },
  ownerUserId: "owner",
  ownerName: "Owner",
  ownerPlan: "agency",
  role: "owner",
  teamLive: true,
  leftoverTeam: false,
  assignedAccountIds: null,
  canBilling: true,
  canTeam: true,
  canManageIg: true,
  canAssignAccounts: true,
};

const memberWs: Workspace = {
  ...ownerWs,
  actor: { id: "mem", email: "mem@x.com", name: "Mem" },
  role: "member",
  assignedAccountIds: ["ig_1"],
  canBilling: false,
  canTeam: false,
  canManageIg: false,
  canAssignAccounts: false,
};

describe("team seats", () => {
  it("counts the owner as seat 1", () => {
    expect(teamSeatsUsed(0)).toBe(1);
    expect(teamSeatsUsed(2)).toBe(3);
    expect(canAddTeamSeat("agency", 1)).toBe(true);
    expect(canAddTeamSeat("agency", 2)).toBe(true);
    expect(canAddTeamSeat("agency", 3)).toBe(false);
    expect(canAddTeamSeat("pro", 1)).toBe(false);
    expect(canAddTeamSeat("free", 1)).toBe(false);
  });

  it("matches invite emails", () => {
    expect(normalizeEmail("  A@X.com ")).toBe("a@x.com");
    expect(emailsMatch("A@x.com", "a@X.COM")).toBe(true);
  });

  it("requires a live Agency plan", () => {
    expect(
      teamPlanLive({
        plan: "agency",
        planExpiresAt: new Date("2030-01-01"),
      }),
    ).toBe(true);
    expect(
      teamPlanLive({ plan: "agency", planExpiresAt: new Date("2020-01-01") }),
    ).toBe(false);
  });
});

describe("workspace IDOR scopes", () => {
  it("lets the owner see every Instagram account they own", () => {
    expect(accountWhere(ownerWs)).toEqual({ userId: "owner" });
    expect(automationWhere(ownerWs)).toEqual({ userId: "owner" });
    expect(executionWhere(ownerWs)).toEqual({
      instagramAccount: { userId: "owner" },
    });
    expect(assertAccountId(ownerWs, "ig_2")).toBe(true);
  });

  it("limits a member to assigned Instagram accounts", () => {
    expect(accountWhere(memberWs)).toEqual({
      userId: "owner",
      id: { in: ["ig_1"] },
    });
    expect(automationWhere(memberWs)).toEqual({
      userId: "owner",
      instagramAccountId: { in: ["ig_1"] },
    });
    expect(executionWhere(memberWs)).toEqual({
      instagramAccountId: { in: ["ig_1"] },
    });
    expect(assertAccountId(memberWs, "ig_1")).toBe(true);
    expect(assertAccountId(memberWs, "ig_2")).toBe(false);
  });
});
