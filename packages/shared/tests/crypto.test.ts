import { describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret } from "../src/crypto";

describe("secret encryption", () => {
  it("round-trips a token without exposing plaintext format assumptions", () => {
    const key = "a".repeat(64);
    const encrypted = encryptSecret("ig-access-token", key);
    expect(encrypted).not.toContain("ig-access-token");
    expect(decryptSecret(encrypted, key)).toBe("ig-access-token");
  });
});
