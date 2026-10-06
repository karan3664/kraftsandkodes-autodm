import { describe, expect, it } from "vitest";
import { faqs, plans } from "./marketing-copy";
import { ACCOUNT_LIMITS, REPLY_LIMITS } from "./plans";

describe("launch marketing copy", () => {
  it("keeps launch prices and plan badges", () => {
    expect(
      plans.map((plan) => [plan.name, plan.price, plan.annual, plan.tag]),
    ).toEqual([
      ["Free", "₹0", null, ""],
      ["Creator", "₹299", "₹2,999/year", "Best Value for Creators"],
      ["Pro", "₹599", "₹5,999/year", "Most Popular"],
      ["Agency", "₹999", "₹9,999/year", "For Agencies"],
    ]);
  });

  it("matches account and reply limits in plans.ts", () => {
    for (const plan of plans) {
      const slug = plan.name.toLowerCase() as keyof typeof ACCOUNT_LIMITS;
      expect(
        plan.points.some((point) =>
          point.includes(`${ACCOUNT_LIMITS[slug]} Instagram`),
        ),
      ).toBe(true);
      expect(
        plan.points.some((point) =>
          point.includes(
            `${REPLY_LIMITS[slug].toLocaleString("en-US")} automated replies`,
          ),
        ),
      ).toBe(true);
    }
  });

  it("keeps Agency team members in the comparison", () => {
    expect(plans.find((plan) => plan.name === "Agency")?.points).toContain(
      "3 team members",
    );
  });

  it("includes bulk-DM, monthly-limit, team, and cancel FAQs", () => {
    const byQ = Object.fromEntries(faqs.map((item) => [item.q, item.a]));
    expect(byQ["Does KRAFTSANDKODES send bulk or unsolicited DMs?"]).toContain(
      "does not provide unsolicited bulk-DM blasting",
    );
    expect(byQ["What happens when I reach my monthly limit?"]).toBe(
      "Automations pause when you reach your plan's monthly automated reply limit. Upgrade to continue immediately or wait for your monthly usage reset.",
    );
    expect(byQ["How many free automated replies do I get?"]).toBe(
      "The Free plan includes 100 automated replies every month.",
    );
    expect(byQ["Does the Agency plan include team members?"]).toContain(
      "3 total team members, including the account owner",
    );
    expect(byQ["Can I cancel anytime?"]).toContain(
      "cancel your paid plan at any time",
    );
  });
});
