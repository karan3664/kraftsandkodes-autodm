import { describe, expect, it } from "vitest";
import { billingPath, safeAppPath, signupForPlan } from "./next-path";

describe("safeAppPath", () => {
  it("defaults Get Started traffic to the dashboard", () => {
    expect(safeAppPath(null)).toBe("/dashboard");
    expect(safeAppPath("/dashboard")).toBe("/dashboard");
  });

  it("keeps billing and a paid plan after login", () => {
    expect(safeAppPath("/dashboard/settings?tab=billing&plan=pro")).toBe(
      "/dashboard/settings?tab=billing&plan=pro",
    );
    expect(signupForPlan("creator")).toContain(
      encodeURIComponent(billingPath("creator")),
    );
  });

  it("rejects open redirects", () => {
    expect(safeAppPath("https://evil.example/phish")).toBe("/dashboard");
    expect(safeAppPath("//evil.example")).toBe("/dashboard");
    expect(safeAppPath("/invite/" + "ab".repeat(32))).toBe(
      "/invite/" + "ab".repeat(32),
    );
    expect(safeAppPath("/invite/not-a-token")).toBe("/dashboard");
  });
});
