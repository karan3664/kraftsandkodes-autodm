import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const completeOAuth = vi.fn();

vi.mock("@/lib/auth/session", () => ({
  requireUser: async () => ({
    id: "user_1",
    email: "dev@example.com",
    name: "Dev",
  }),
}));

vi.mock("@/lib/team/workspace", () => ({
  loadWorkspace: async (user: { id: string }) => ({
    actor: user,
    ownerUserId: user.id,
    ownerName: "Dev",
    ownerPlan: "free",
    role: "owner",
    teamLive: false,
    leftoverTeam: false,
    assignedAccountIds: null,
    canBilling: true,
    canTeam: true,
    canManageIg: true,
    canAssignAccounts: true,
  }),
}));
vi.mock("@/lib/instagram-oauth", () => ({
  completeOAuth: (...args: unknown[]) => completeOAuth(...args),
  INSTAGRAM_OAUTH_STATE_COOKIE: "autodm_ig_oauth_state",
  oauthCallbackUrl: () => "http://localhost:3000/api/instagram/callback",
  InstagramAccountLimitError: class InstagramAccountLimitError extends Error {},
  InstagramAccountTakenError: class InstagramAccountTakenError extends Error {},
}));

describe("instagram oauth callback", () => {
  beforeEach(() => {
    process.env.NODE_ENV = "test";
    process.env.APP_URL = "http://localhost:3000";
    completeOAuth.mockReset();
    completeOAuth.mockResolvedValue(undefined);
  });

  it("rejects a missing or mismatched state", async () => {
    const { GET } = await import("./route");
    const response = await GET(
      new NextRequest(
        "http://localhost:3000/api/instagram/callback?code=abc&state=wrong",
        {
          headers: { cookie: "autodm_ig_oauth_state=expected" },
        },
      ),
    );
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("error=oauth_state");
    expect(completeOAuth).not.toHaveBeenCalled();
  });

  it("exchanges a valid code after stripping the Meta suffix and redirects to the dashboard", async () => {
    const { GET } = await import("./route");
    const response = await GET(
      new NextRequest(
        "http://localhost:3000/api/instagram/callback?code=abc123%23_&state=expected",
        {
          headers: { cookie: "autodm_ig_oauth_state=expected" },
        },
      ),
    );
    expect(completeOAuth).toHaveBeenCalledWith(
      "abc123",
      "user_1",
      "http://localhost:3000/api/instagram/callback",
    );
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/dashboard/instagram",
    );
  });

  it("returns to overview when the connect flow set that next cookie", async () => {
    const { GET } = await import("./route");
    const response = await GET(
      new NextRequest(
        "http://localhost:3000/api/instagram/callback?code=abc123&state=expected",
        {
          headers: {
            cookie:
              "autodm_ig_oauth_state=expected; autodm_ig_oauth_next=/dashboard",
          },
        },
      ),
    );
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/dashboard",
    );
  });

  it("redirects when the user denies authorization", async () => {
    const { GET } = await import("./route");
    const response = await GET(
      new NextRequest(
        "http://localhost:3000/api/instagram/callback?error=access_denied&error_reason=user_denied",
      ),
    );
    expect(response.headers.get("location")).toContain("error=oauth_denied");
    expect(completeOAuth).not.toHaveBeenCalled();
  });
});
