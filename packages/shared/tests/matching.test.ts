import { describe, expect, it } from "vitest";
import {
  matchAutomation,
  matchKeywords,
  selectAutomationMatch,
} from "../src/matching";

describe("matchAutomation", () => {
  const contains = {
    keyword: "TRAIN",
    matchType: "contains" as const,
    caseSensitive: false,
  };

  const exact = {
    keyword: "TRAIN",
    matchType: "exact" as const,
    caseSensitive: false,
  };

  it("matches exact TRAIN", () => {
    expect(matchAutomation("TRAIN", exact)).toBe(true);
  });

  it("matches contains TRAIN", () => {
    expect(matchAutomation("TRAIN", contains)).toBe(true);
  });

  it("is case insensitive by default", () => {
    expect(matchAutomation("train", contains)).toBe(true);
    expect(matchAutomation("Train", exact)).toBe(true);
  });

  it("matches contains inside a sentence", () => {
    expect(matchAutomation("Need TRAIN link", contains)).toBe(true);
    expect(matchAutomation("Need train link", contains)).toBe(true);
  });

  it("matches punctuation around the keyword", () => {
    expect(matchAutomation("TRAIN!!!", contains)).toBe(true);
    expect(matchAutomation("TRAIN!!!", exact)).toBe(true);
  });

  it("trims whitespace", () => {
    expect(matchAutomation("  TRAIN  ", exact)).toBe(true);
    expect(matchAutomation("  need TRAIN  ", contains)).toBe(true);
  });

  it("does not match unrelated words", () => {
    expect(matchAutomation("TRAVEL", contains)).toBe(false);
    expect(matchAutomation("training", contains)).toBe(false);
    expect(matchAutomation("Need TRAIN link", exact)).toBe(false);
  });

  it("matches the longest keyword first", () => {
    expect(
      matchKeywords("Need TRAIN LINK please", ["TRAIN", "TRAIN LINK", "LINK"], {
        matchType: "contains",
        caseSensitive: false,
      }),
    ).toBe("TRAIN LINK");
  });

  it("allows the same keyword shape to be evaluated independently", () => {
    expect(
      matchKeywords("LINK", ["LINK"], {
        matchType: "exact",
        caseSensitive: false,
      }),
    ).toBe("LINK");
    expect(
      matchKeywords("TRAIN", ["TRAIN", "TRAIN LINK"], {
        matchType: "contains",
        caseSensitive: false,
      }),
    ).toBe("TRAIN");
  });

  it("selects one automation: exact, then longest keyword, then oldest", () => {
    const selected = selectAutomationMatch("TRAIN LINK please", [
      {
        id: "contains-short",
        createdAt: 1,
        matchType: "contains",
        caseSensitive: false,
        keywords: ["TRAIN"],
      },
      {
        id: "contains-long-newer",
        createdAt: 3,
        matchType: "contains",
        caseSensitive: false,
        keywords: ["TRAIN LINK"],
      },
      {
        id: "exact-older",
        createdAt: 2,
        matchType: "exact",
        caseSensitive: false,
        keywords: ["TRAIN LINK PLEASE"],
      },
    ]);
    expect(selected).toEqual({
      automationId: "exact-older",
      matchedKeyword: "TRAIN LINK PLEASE",
    });
  });

  it("breaks an exact tie by choosing the oldest automation", () => {
    const selected = selectAutomationMatch("TRAIN", [
      {
        id: "newer",
        createdAt: 20,
        matchType: "exact",
        caseSensitive: false,
        keywords: ["TRAIN"],
      },
      {
        id: "older",
        createdAt: 10,
        matchType: "exact",
        caseSensitive: false,
        keywords: ["TRAIN"],
      },
    ]);
    expect(selected?.automationId).toBe("older");
  });

  it("selects keyword matches before an any-comment automation", () => {
    const selected = selectAutomationMatch("hello there", [
      {
        id: "any-older",
        createdAt: 1,
        matchType: "all_comments",
        caseSensitive: false,
        keywords: ["*"],
      },
      {
        id: "contains-hello",
        createdAt: 9,
        matchType: "contains",
        caseSensitive: false,
        keywords: ["hello"],
      },
    ]);
    expect(selected).toEqual({
      automationId: "contains-hello",
      matchedKeyword: "hello",
    });
  });

  it("matches any comment when the stored keyword is *", () => {
    expect(
      matchKeywords("random comment", ["*"], {
        matchType: "contains",
        caseSensitive: false,
      }),
    ).toBe("*");
  });
});
