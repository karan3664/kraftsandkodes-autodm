import { beforeEach, describe, expect, it, vi } from "vitest";
import { encryptSecret } from "@kdl/shared/crypto";

const update = vi.fn();
const findMany = vi.fn();

vi.mock("@kdl/db", () => ({
  prisma: {
    instagramAccount: {
      update: (...args: unknown[]) => update(...args),
      findMany: (...args: unknown[]) => findMany(...args),
    },
  },
}));

vi.mock("./env", () => ({
  getEnv: () => ({
    TOKEN_ENCRYPTION_KEY: "dev-only-encryption-key-change-me",
    REDIS_URL: "",
  }),
}));

vi.mock("./redis", () => ({
  getRedis: () => null,
}));

vi.mock("./instagram", () => ({
  getInstagramClient: () => ({
    refreshToken: vi.fn(),
  }),
}));

vi.mock("./logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe("instagram token refresh", () => {
  beforeEach(() => {
    update.mockReset();
    findMany.mockReset();
    update.mockResolvedValue({});
  });

  it("does not refresh when token is not near expiry", async () => {
    const { needsTokenRefresh, refreshInstagramAccountToken } =
      await import("./instagram-token-refresh");
    const far = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    expect(needsTokenRefresh(far)).toBe(false);
    const result = await refreshInstagramAccountToken({
      id: "acc_1",
      accessTokenEncrypted: encryptSecret(
        "plain-token",
        "dev-only-encryption-key-change-me",
      ),
      tokenExpiresAt: far,
    });
    expect(result.status).toBe("skipped");
    expect(update).not.toHaveBeenCalled();
  });

  it("refreshes near-expiry tokens and stores encrypted value", async () => {
    const { refreshInstagramAccountToken } =
      await import("./instagram-token-refresh");
    const near = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    const expiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
    const result = await refreshInstagramAccountToken(
      {
        id: "acc_1",
        accessTokenEncrypted: encryptSecret(
          "old-token",
          "dev-only-encryption-key-change-me",
        ),
        tokenExpiresAt: near,
      },
      new Date(),
      {
        refreshToken: async () => ({
          accessToken: "new-token-value",
          expiresAt,
        }),
      },
    );
    expect(result.status).toBe("refreshed");
    expect(update).toHaveBeenCalledTimes(1);
    const data = update.mock.calls[0]?.[0]?.data as {
      accessTokenEncrypted: string;
      tokenExpiresAt: Date;
    };
    expect(data.accessTokenEncrypted).not.toContain("new-token-value");
    expect(data.accessTokenEncrypted).not.toContain("old-token");
    expect(data.tokenExpiresAt).toEqual(expiresAt);
  });

  it("marks failure without logging the token", async () => {
    const { logger } = await import("./logger");
    const { refreshInstagramAccountToken } =
      await import("./instagram-token-refresh");
    const near = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    const result = await refreshInstagramAccountToken(
      {
        id: "acc_2",
        accessTokenEncrypted: encryptSecret(
          "secret-token-xyz",
          "dev-only-encryption-key-change-me",
        ),
        tokenExpiresAt: near,
      },
      new Date(),
      {
        refreshToken: async () => {
          throw new Error("graph down");
        },
      },
    );
    expect(result.status).toBe("failed");
    expect(update).toHaveBeenCalled();
    const warn = vi.mocked(logger.warn);
    expect(warn).toHaveBeenCalled();
    const logged = JSON.stringify(warn.mock.calls);
    expect(logged).not.toContain("secret-token-xyz");
  });
});
