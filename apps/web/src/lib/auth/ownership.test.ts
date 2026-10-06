import { beforeEach, describe, expect, it, vi } from "vitest";

const findFirst = vi.fn();

vi.mock("@kdl/db", () => ({
  prisma: {
    automation: { findFirst: (...args: unknown[]) => findFirst(...args) },
    instagramAccount: {
      findFirst: (...args: unknown[]) => findFirst(...args),
    },
    instagramMedia: { findFirst: (...args: unknown[]) => findFirst(...args) },
  },
}));

describe("ownership IDOR guards", () => {
  beforeEach(() => {
    findFirst.mockReset();
    findFirst.mockResolvedValue(null);
  });

  it("scopes automations to the requesting user", async () => {
    const { getOwnedAutomation } = await import("./ownership");
    await getOwnedAutomation("user_a", "auto_b");
    expect(findFirst).toHaveBeenCalledWith({
      where: { id: "auto_b", userId: "user_a" },
    });
  });

  it("scopes Instagram accounts to the requesting user", async () => {
    const { getOwnedInstagramAccount } = await import("./ownership");
    await getOwnedInstagramAccount("user_a", "acc_b");
    expect(findFirst).toHaveBeenCalledWith({
      where: { id: "acc_b", userId: "user_a" },
    });
  });

  it("scopes accessible resources to workspace assignment", async () => {
    const { getAccessibleInstagramAccount } = await import("./ownership");
    const ws = {
      ownerUserId: "owner",
      assignedAccountIds: ["acc_ok"],
    } as never;
    await getAccessibleInstagramAccount(ws, "acc_other");
    expect(findFirst).not.toHaveBeenCalled();
    await getAccessibleInstagramAccount(ws, "acc_ok");
    expect(findFirst).toHaveBeenCalledWith({
      where: { id: "acc_ok", userId: "owner" },
    });
  });

  it("scopes media to the requesting user and account", async () => {
    const { getOwnedMedia } = await import("./ownership");
    await getOwnedMedia("user_a", "media_1", "acc_1");
    expect(findFirst).toHaveBeenCalledWith({
      where: {
        id: "media_1",
        instagramAccountId: "acc_1",
        instagramAccount: { userId: "user_a" },
      },
    });
  });
});
