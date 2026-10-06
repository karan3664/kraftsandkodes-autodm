import { describe, expect, it } from "vitest";
import { APP_ORIGIN, appHref } from "./hosts";

describe("appHref", () => {
  it("prefixes production auth paths onto the app origin", () => {
    expect(appHref("/auth/signup", APP_ORIGIN)).toBe(
      `${APP_ORIGIN}/auth/signup`,
    );
    expect(
      appHref("/auth/signup?next=%2Fdashboard%2Fsettings", APP_ORIGIN),
    ).toBe(`${APP_ORIGIN}/auth/signup?next=%2Fdashboard%2Fsettings`);
  });
});
