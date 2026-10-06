import { describe, expect, it } from "vitest";
import { isAdminEmail, withFounderAdmin } from "./admin";

describe("isAdminEmail", () => {
  const admins = ["dev@karandigitallabs.com"];

  it("matches case-insensitively with whitespace", () => {
    expect(isAdminEmail(" Dev@KaranDigitalLabs.com ", admins)).toBe(true);
  });

  it("rejects everyone else and empty allowlists", () => {
    expect(isAdminEmail("user@example.com", admins)).toBe(false);
    expect(isAdminEmail("dev@karandigitallabs.com", [])).toBe(false);
  });

  it("always keeps the founder email in the allowlist", () => {
    expect(withFounderAdmin([])).toContain("dev@karandigitallabs.com");
  });
});

describe("isAdminEmail", () => {
  const admins = ["dev@karandigitallabs.com"];

  it("matches case-insensitively with whitespace", () => {
    expect(isAdminEmail(" Dev@KaranDigitalLabs.com ", admins)).toBe(true);
  });

  it("rejects everyone else and empty allowlists", () => {
    expect(isAdminEmail("user@example.com", admins)).toBe(false);
    expect(isAdminEmail("dev@karandigitallabs.com", [])).toBe(false);
  });
});
