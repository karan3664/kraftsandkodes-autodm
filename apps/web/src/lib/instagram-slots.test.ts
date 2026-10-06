import { describe, expect, it } from "vitest";
import { canConnectAccount } from "./plans";

describe("instagram account slots", () => {
  it("treats every ever-linked account as used capacity", () => {
    // Creator limit 2: A connected + A disconnected still counts as 1 used
    // when counting rows; a second new IG id at used=2 is blocked.
    expect(canConnectAccount(0, "creator")).toBe(true);
    expect(canConnectAccount(1, "creator")).toBe(true);
    expect(canConnectAccount(2, "creator")).toBe(false);
  });
});
