import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export async function pingDatabase(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

export { Prisma, PrismaClient } from "@prisma/client";
export type {
  User,
  Session,
  InstagramAccount,
  InstagramMedia,
  Automation,
  AutomationKeyword,
  AutomationExecution,
  WebhookEvent,
  Payment,
  MatchType,
  ExecutionStatus,
  AutomationActionType,
  PaymentStatus,
  TeamMember,
  TeamMemberAccount,
  TeamRole,
  TeamMemberStatus,
} from "@prisma/client";
