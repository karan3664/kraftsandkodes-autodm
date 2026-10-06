import { describe, expect, it } from "vitest";
import {
  accountLimit,
  activityHistorySince,
  canConnectAccount,
  canEnableAnotherAutomation,
  getEffectivePlan,
  monthWindow,
  normalizePlan,
  paidCatalogRow,
  PAID_CATALOG,
  replyLimit,
  teamMemberLimit,
  usageAlert,
} from "./plans";
import { parseOrderAmount } from "./razorpay";

describe("plans", () => {
  it("maps starter to free limits", () => {
    expect(normalizePlan("starter")).toBe("free");
    expect(accountLimit("starter")).toBe(1);
    expect(replyLimit("free")).toBe(100);
    expect(accountLimit("agency")).toBe(15);
  });

  it("enforces Instagram account caps per plan", () => {
    expect(canConnectAccount(0, "free")).toBe(true);
    expect(canConnectAccount(1, "free")).toBe(false);
    expect(canConnectAccount(1, "creator")).toBe(true);
    expect(canConnectAccount(2, "creator")).toBe(false);
    expect(canConnectAccount(4, "pro")).toBe(true);
    expect(canConnectAccount(5, "pro")).toBe(false);
    expect(canConnectAccount(14, "agency")).toBe(true);
    expect(canConnectAccount(15, "agency")).toBe(false);
  });

  it("enforces reply caps per plan", () => {
    expect(replyLimit("free")).toBe(100);
    expect(replyLimit("creator")).toBe(5_000);
    expect(replyLimit("pro")).toBe(20_000);
    expect(replyLimit("agency")).toBe(50_000);
    expect(teamMemberLimit("agency")).toBe(3);
    expect(teamMemberLimit("free")).toBe(0);
  });

  it("enforces one active automation on free", () => {
    expect(canEnableAnotherAutomation(0, "free")).toBe(true);
    expect(canEnableAnotherAutomation(1, "free")).toBe(false);
    expect(canEnableAnotherAutomation(40, "creator")).toBe(true);
    expect(canEnableAnotherAutomation(40, "pro")).toBe(true);
    expect(canConnectAccount(20, "free", true)).toBe(true);
    expect(canEnableAnotherAutomation(9, "free", true)).toBe(true);
    expect(usageAlert(10, "free", true)).toBeNull();
    expect(
      activityHistorySince("free", new Date("2026-10-15T00:00:00.000Z"), true),
    ).toBeNull();
  });

  it("uses a UTC calendar month window", () => {
    const { start, end } = monthWindow(new Date("2026-10-15T12:00:00.000Z"));
    expect(start.toISOString()).toBe("2026-10-01T00:00:00.000Z");
    expect(end.toISOString()).toBe("2026-11-01T00:00:00.000Z");
  });

  it("keeps free activity to 7 days", () => {
    const at = new Date("2026-10-15T00:00:00.000Z");
    expect(activityHistorySince("free", at)?.toISOString()).toBe(
      "2026-10-08T00:00:00.000Z",
    );
    expect(activityHistorySince("creator", at)).toBeNull();
  });

  it("warns at 80 / 90 / 100 percent usage", () => {
    expect(usageAlert(80, "free")?.message).toBe(
      "You're almost out of free automated replies.",
    );
    expect(usageAlert(90, "free")?.cta).toBe("Upgrade to Creator — ₹299/month");
    expect(usageAlert(100, "free")?.message).toBe(
      "You've used all 100 free automated replies this month.",
    );
    expect(usageAlert(100, "free")?.cta).toBe(
      "Upgrade to Creator — ₹299/month",
    );
    expect(usageAlert(5_000, "creator")?.message).toBe(
      "You've reached your monthly automated reply limit.",
    );
    expect(usageAlert(20_000, "pro")?.tone).toBe("danger");
    expect(usageAlert(50_000, "agency")?.tone).toBe("danger");
    expect(usageAlert(1_000, "creator")).toBeNull();
  });

  it("accepts only the official paid catalog amounts", () => {
    expect(paidCatalogRow(29_900)?.slug).toBe("creator");
    expect(paidCatalogRow(299_900)?.days).toBe(365);
    expect(paidCatalogRow(59_900)?.slug).toBe("pro");
    expect(paidCatalogRow(599_900)?.days).toBe(365);
    expect(paidCatalogRow(99_900)?.slug).toBe("agency");
    expect(paidCatalogRow(999_900)?.slug).toBe("agency");
    expect(parseOrderAmount(29_900)).toBe(29_900);
    expect(parseOrderAmount(299_900)).toBe(299_900);
    expect(parseOrderAmount(59_900)).toBe(59_900);
    expect(parseOrderAmount(599_900)).toBe(599_900);
    expect(parseOrderAmount(99_900)).toBe(99_900);
    expect(parseOrderAmount(999_900)).toBe(999_900);
  });

  it("rejects legacy and arbitrary amounts", () => {
    expect(paidCatalogRow(79_900)).toBeNull();
    expect(paidCatalogRow(199_900)).toBeNull();
    expect(parseOrderAmount(79_900)).toBeNull();
    expect(parseOrderAmount(199_900)).toBeNull();
    expect(parseOrderAmount(12_345)).toBeNull();
    expect(
      PAID_CATALOG.every((row) => ![79_900, 199_900].includes(row.amountPaise)),
    ).toBe(true);
  });
});

describe("getEffectivePlan", () => {
  const future = new Date("2030-01-01T00:00:00.000Z");
  const past = new Date("2020-01-01T00:00:00.000Z");
  const now = new Date("2026-10-05T12:00:00.000Z");

  it("keeps free as free", () => {
    expect(getEffectivePlan({ plan: "free" }, now)).toBe("free");
    expect(getEffectivePlan({ plan: "starter" }, now)).toBe("free");
  });

  it("returns active paid plans", () => {
    expect(
      getEffectivePlan({ plan: "creator", planExpiresAt: future }, now),
    ).toBe("creator");
    expect(getEffectivePlan({ plan: "pro", planExpiresAt: future }, now)).toBe(
      "pro",
    );
    expect(
      getEffectivePlan({ plan: "agency", planExpiresAt: future }, now),
    ).toBe("agency");
  });

  it("treats expired paid plans as free", () => {
    expect(
      getEffectivePlan({ plan: "creator", planExpiresAt: past }, now),
    ).toBe("free");
    expect(getEffectivePlan({ plan: "pro", planExpiresAt: past }, now)).toBe(
      "free",
    );
    expect(getEffectivePlan({ plan: "agency", planExpiresAt: past }, now)).toBe(
      "free",
    );
  });

  it("treats paid plans without expiry as free", () => {
    expect(
      getEffectivePlan({ plan: "creator", planExpiresAt: null }, now),
    ).toBe("free");
  });
});
