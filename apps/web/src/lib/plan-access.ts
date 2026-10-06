import { prisma } from "@kdl/db";
import {
  getEffectivePlan,
  normalizePlan,
  type PlanSlug,
  type PlanUser,
} from "./plans";

/** Persist free when a stored paid plan has expired. Data is kept. */
export async function syncExpiredPlan(
  user: PlanUser & { id: string },
  now = new Date(),
): Promise<PlanSlug> {
  const effective = getEffectivePlan(user, now);
  const stored = normalizePlan(user.plan);
  if (stored !== "free" && effective === "free") {
    await prisma.user.update({
      where: { id: user.id },
      data: { plan: "free" },
    });
  }
  return effective;
}

export async function loadEffectivePlan(
  userId: string,
  now = new Date(),
): Promise<PlanSlug> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, plan: true, planExpiresAt: true },
  });
  if (!user) {
    return "free";
  }
  return syncExpiredPlan(user, now);
}
