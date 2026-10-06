import { describe, expect, it } from "vitest";
import { pickSelectedInstagramAccount } from "./instagram-account-pick";

describe("pickSelectedInstagramAccount", () => {
  const accounts = [{ id: "a" }, { id: "b" }, { id: "c" }];

  it("returns null when the user has no accounts", () => {
    expect(pickSelectedInstagramAccount([], "a")).toBeNull();
  });

  it("uses the cookie when it belongs to this user", () => {
    expect(pickSelectedInstagramAccount(accounts, "b")?.id).toBe("b");
  });

  it("ignores a foreign or stale cookie id", () => {
    expect(pickSelectedInstagramAccount(accounts, "stolen")?.id).toBe("a");
  });
});
