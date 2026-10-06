import { describe, expect, it } from "vitest";
import { titleFromCaption } from "./title-from-caption";

describe("titleFromCaption", () => {
  it("does not split a surrogate pair at the limit", () => {
    const caption = `${"a".repeat(47)}🥹🫶 rest`;
    expect(titleFromCaption(caption, 48)).toBe(`${"a".repeat(47)}🥹…`);
  });
});
