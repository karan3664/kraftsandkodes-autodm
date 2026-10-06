export const INSTAGRAM_ACCOUNT_LIMIT_MESSAGE =
  "You've reached your Instagram account limit.";

export const PLAN_SLUGS = ["free", "creator", "pro", "agency"] as const;
export type PlanSlug = (typeof PLAN_SLUGS)[number];

export type PaidCatalogRow = {
  slug: Exclude<PlanSlug, "free">;
  label: string;
  amountPaise: number;
  days: number;
};

export const ACCOUNT_LIMITS: Record<PlanSlug, number> = {
  free: 1,
  creator: 2,
  pro: 5,
  agency: 15,
};

export const REPLY_LIMITS: Record<PlanSlug, number> = {
  free: 100,
  creator: 5_000,
  pro: 20_000,
  agency: 50_000,
};

/** Total seats including the owner. 0 = team not included. */
export const TEAM_MEMBER_LIMITS: Record<PlanSlug, number> = {
  free: 0,
  creator: 0,
  pro: 0,
  agency: 3,
};

export const TEAM_LIMIT_MESSAGE =
  "Your Agency plan includes up to 3 team members.";

/** `Infinity` = unlimited active automations. */
export const ACTIVE_AUTOMATION_LIMITS: Record<PlanSlug, number> = {
  free: 1,
  creator: Number.POSITIVE_INFINITY,
  pro: Number.POSITIVE_INFINITY,
  agency: Number.POSITIVE_INFINITY,
};

export const ACTIVITY_HISTORY_DAYS: Record<PlanSlug, number | null> = {
  free: 7,
  creator: null,
  pro: null,
  agency: null,
};

/** Canonical payable amounts (paise). Server rejects anything else. */
export const PAID_CATALOG: PaidCatalogRow[] = [
  { slug: "creator", label: "Creator", amountPaise: 29_900, days: 30 },
  { slug: "pro", label: "Pro", amountPaise: 59_900, days: 30 },
  { slug: "agency", label: "Agency", amountPaise: 99_900, days: 30 },
  { slug: "creator", label: "Creator", amountPaise: 299_900, days: 365 },
  { slug: "pro", label: "Pro", amountPaise: 599_900, days: 365 },
  { slug: "agency", label: "Agency", amountPaise: 999_900, days: 365 },
];

export type PlanUser = {
  plan?: string | null;
  planExpiresAt?: Date | string | null;
};

export function normalizePlan(raw: string | null | undefined): PlanSlug {
  const value = (raw ?? "free").toLowerCase();
  if (value === "starter") return "free";
  if (value === "creator" || value === "pro" || value === "agency") {
    return value;
  }
  return "free";
}

/**
 * Server-side effective plan. Paid access ends when planExpiresAt is missing or past.
 * UI must not be trusted for gating.
 */
export function getEffectivePlan(user: PlanUser, now = new Date()): PlanSlug {
  const slug = normalizePlan(user.plan);
  if (slug === "free") {
    return "free";
  }
  if (user.planExpiresAt == null || user.planExpiresAt === "") {
    return "free";
  }
  const expiresAt = new Date(user.planExpiresAt);
  if (
    Number.isNaN(expiresAt.getTime()) ||
    expiresAt.getTime() <= now.getTime()
  ) {
    return "free";
  }
  return slug;
}

export function accountLimit(plan: string | null | undefined): number {
  return ACCOUNT_LIMITS[normalizePlan(plan)];
}

export function replyLimit(plan: string | null | undefined): number {
  return REPLY_LIMITS[normalizePlan(plan)];
}

export function teamMemberLimit(plan: string | null | undefined): number {
  return TEAM_MEMBER_LIMITS[normalizePlan(plan)];
}

export function activeAutomationLimit(plan: string | null | undefined): number {
  return ACTIVE_AUTOMATION_LIMITS[normalizePlan(plan)];
}

export function canConnectAccount(
  used: number,
  plan: string | null | undefined,
  admin = false,
): boolean {
  if (admin) return true;
  return used < accountLimit(plan);
}

export function canEnableAnotherAutomation(
  otherEnabledCount: number,
  plan: string | null | undefined,
  admin = false,
): boolean {
  if (admin) return true;
  return otherEnabledCount < activeAutomationLimit(plan);
}

export function paidCatalogRow(amountPaise: number): PaidCatalogRow | null {
  return PAID_CATALOG.find((row) => row.amountPaise === amountPaise) ?? null;
}

export function monthWindow(at = new Date()): { start: Date; end: Date } {
  const start = new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), 1));
  const end = new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth() + 1, 1));
  return { start, end };
}

export function activityHistorySince(
  plan: string | null | undefined,
  at = new Date(),
  admin = false,
): Date | null {
  if (admin) return null;
  const days = ACTIVITY_HISTORY_DAYS[normalizePlan(plan)];
  if (days == null) return null;
  return new Date(at.getTime() - days * 24 * 60 * 60 * 1000);
}

export type UsageAlert = {
  tone: "warn" | "danger";
  message: string;
  cta: string;
};

export function usageAlert(
  used: number,
  plan: string | null | undefined,
  admin = false,
): UsageAlert | null {
  if (admin) return null;
  const limit = replyLimit(plan);
  if (limit <= 0) return null;
  const slug = normalizePlan(plan);
  if (used >= limit) {
    if (slug === "free") {
      return {
        tone: "danger",
        message: "You've used all 100 free automated replies this month.",
        cta: "Upgrade to Creator — ₹299/month",
      };
    }
    return {
      tone: "danger",
      message: "You've reached your monthly automated reply limit.",
      cta: "Upgrade Plan",
    };
  }
  const pct = (used / limit) * 100;
  if (slug === "free" && pct >= 80) {
    return {
      tone: "warn",
      message: "You're almost out of free automated replies.",
      cta: "Upgrade to Creator — ₹299/month",
    };
  }
  if (pct >= 90) {
    return {
      tone: "warn",
      message: "You're using 90% of your monthly automated replies.",
      cta: "Upgrade Plan",
    };
  }
  if (pct >= 80) {
    return {
      tone: "warn",
      message: "You're almost out of automated replies.",
      cta: "Upgrade Plan",
    };
  }
  return null;
}
