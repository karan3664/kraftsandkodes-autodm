import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const requireUser = vi.fn();
const getAccessibleInstagramAccount = vi.fn();
const loadWorkspace = vi.fn();

vi.mock("@/lib/auth/session", () => ({
  requireUser: () => requireUser(),
}));

vi.mock("@/lib/team/workspace", () => ({
  loadWorkspace: (...args: unknown[]) => loadWorkspace(...args),
}));

vi.mock("@/lib/auth/ownership", () => ({
  getAccessibleInstagramAccount: (...args: unknown[]) =>
    getAccessibleInstagramAccount(...args),
}));

vi.mock("@/lib/csrf", () => ({
  assertSameOrigin: () => null,
}));

vi.mock("@/lib/instagram-selection", () => ({
  setSelectedInstagramCookie: vi.fn(),
}));

describe("instagram select", () => {
  beforeEach(() => {
    requireUser.mockReset();
    getAccessibleInstagramAccount.mockReset();
    loadWorkspace.mockReset();
    requireUser.mockResolvedValue({
      id: "user_a",
      email: "a@x.com",
      name: "A",
    });
    loadWorkspace.mockResolvedValue({
      ownerUserId: "user_a",
      assignedAccountIds: null,
    });
  });

  it("rejects another user's Instagram account", async () => {
    getAccessibleInstagramAccount.mockResolvedValue(null);
    const { POST } = await import("./route");
    const response = await POST(
      new NextRequest("http://localhost:3000/api/instagram/select", {
        method: "POST",
        body: JSON.stringify({ accountId: "acc_b" }),
      }),
    );
    expect(response.status).toBe(403);
    expect(getAccessibleInstagramAccount).toHaveBeenCalled();
  });
});
