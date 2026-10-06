import { getEffectivePlan, teamMemberLimit, type PlanSlug } from "../plans";

export const INVITE_TTL_MS = 24 * 60 * 60 * 1000;

export type TeamRoleName = "owner" | "admin" | "member";

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function emailsMatch(left: string, right: string): boolean {
  return normalizeEmail(left) === normalizeEmail(right);
}

export function teamSeatsUsed(activeMemberRows: number): number {
  return 1 + activeMemberRows;
}

export function canAddTeamSeat(plan: PlanSlug, used: number): boolean {
  const limit = teamMemberLimit(plan);
  return limit > 0 && used < limit;
}

export function teamPlanLive(
  user: { plan?: string | null; planExpiresAt?: Date | string | null },
  now = new Date(),
): boolean {
  return getEffectivePlan(user, now) === "agency";
}
