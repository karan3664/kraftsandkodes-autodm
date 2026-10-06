import { Prisma, prisma } from "@kdl/db";
import { isAdminEmail } from "../auth/admin";
import { getEnv } from "../env";
import {
  getEffectivePlan,
  monthWindow,
  normalizePlan,
  replyLimit,
} from "../plans";

export type EngineAccount = {
  id: string;
  userId: string;
  plan: string;
  instagramUserId: string;
  username: string;
  accessTokenEncrypted: string;
};

export type AwaitingFollow = {
  instagramCommentId: string;
  commenterUsername: string | null;
  automation: {
    id: string;
    privateReplyMessage: string;
    notFollowingMessage: string | null;
  };
};

export type EngineMedia = {
  id: string;
  instagramMediaId: string;
};

export type EngineAutomation = {
  id: string;
  createdAt: Date;
  matchType: "exact" | "contains" | "all_comments";
  actionType: "private_reply" | "comment_reply";
  caseSensitive: boolean;
  privateReplyMessage: string;
  requireFollow: boolean;
  followPromptMessage: string | null;
  commentReplyMessage: string | null;
  ignoreOwnComments: boolean;
  keywords: Array<{ keyword: string }>;
};

export type ExecutionOutcome =
  "awaiting_follow" | "sent" | "skipped" | "failed";

export type EngineExecution = {
  id: string;
  status: "pending" | ExecutionOutcome;
  automationId: string;
  instagramCommentId: string;
  matchedKeyword: string;
  messageText: string;
  errorMessage: string | null;
  errorCode: string | null;
};

export type ExecutionDraft = {
  automationId: string;
  instagramAccountId: string;
  instagramMediaId: string;
  instagramCommentId: string;
  commenterInstagramId?: string;
  commenterUsername?: string;
  commentText: string;
  matchedKeyword: string;
  messageText: string;
};

export interface AutomationEngineStore {
  insertWebhookEvent(input: {
    eventId: string;
    payloadHash: string;
  }): Promise<"created" | "exists">;
  webhookProcessed(eventId: string): Promise<boolean>;
  markWebhook(
    eventId: string,
    input: { processed: boolean; processingError?: string | null },
  ): Promise<void>;
  findAccount(instagramUserId: string): Promise<EngineAccount | null>;
  findMedia(
    instagramAccountId: string,
    instagramMediaId: string,
  ): Promise<EngineMedia | null>;
  findEnabledAutomations(
    instagramAccountId: string,
    mediaId: string,
  ): Promise<EngineAutomation[]>;
  findExecution(
    instagramAccountId: string,
    instagramCommentId: string,
  ): Promise<EngineExecution | null>;
  insertPendingExecution(input: ExecutionDraft): Promise<"created" | "exists">;
  updateExecution(
    instagramAccountId: string,
    instagramCommentId: string,
    input: {
      status: ExecutionOutcome;
      httpStatus: number | null;
      errorMessage: string | null;
      errorCode: string | null;
    },
  ): Promise<void>;
  findAwaitingFollow(
    instagramAccountId: string,
    commenterInstagramId: string,
    since: Date,
  ): Promise<AwaitingFollow | null>;
  countUserSentThisMonth(userId: string): Promise<number>;
  claimReplySlot(userId: string, plan: string): Promise<boolean>;
  releaseReplySlot(userId: string): Promise<void>;
}

function isUniqueConflict(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

export const prismaEngineStore: AutomationEngineStore = {
  async insertWebhookEvent(input) {
    try {
      await prisma.webhookEvent.create({
        data: {
          eventId: input.eventId,
          eventType: "instagram.comment",
          payloadHash: input.payloadHash,
        },
      });
      return "created";
    } catch (error) {
      if (isUniqueConflict(error)) {
        return "exists";
      }
      throw error;
    }
  },
  async webhookProcessed(eventId) {
    const event = await prisma.webhookEvent.findUnique({ where: { eventId } });
    return Boolean(event?.processed);
  },
  async markWebhook(eventId, input) {
    await prisma.webhookEvent.update({
      where: { eventId },
      data: {
        processed: input.processed,
        processingError: input.processingError ?? null,
      },
    });
  },
  async findAccount(instagramUserId) {
    return prisma.instagramAccount
      .findFirst({
        where: { instagramUserId, disconnectedAt: null },
        select: {
          id: true,
          userId: true,
          instagramUserId: true,
          username: true,
          accessTokenEncrypted: true,
          user: { select: { plan: true, planExpiresAt: true } },
        },
      })
      .then((row) =>
        row
          ? {
              id: row.id,
              userId: row.userId,
              plan: getEffectivePlan(row.user),
              instagramUserId: row.instagramUserId,
              username: row.username,
              accessTokenEncrypted: row.accessTokenEncrypted,
            }
          : null,
      );
  },
  async findMedia(instagramAccountId, instagramMediaId) {
    return prisma.instagramMedia.findUnique({
      where: {
        instagramAccountId_instagramMediaId: {
          instagramAccountId,
          instagramMediaId,
        },
      },
      select: { id: true, instagramMediaId: true },
    });
  },
  async findEnabledAutomations(instagramAccountId, mediaId) {
    const rows = await prisma.automation.findMany({
      where: { instagramAccountId, mediaId, enabled: true },
      include: { keywords: true },
      orderBy: { createdAt: "asc" },
    });
    return rows.map((row) => ({
      id: row.id,
      createdAt: row.createdAt,
      matchType: row.matchType,
      actionType: row.actionType,
      caseSensitive: row.caseSensitive,
      privateReplyMessage: row.privateReplyMessage,
      requireFollow: row.requireFollow,
      followPromptMessage: row.followPromptMessage,
      commentReplyMessage: row.commentReplyMessage,
      ignoreOwnComments: row.ignoreOwnComments,
      keywords: row.keywords.map((keyword) => ({ keyword: keyword.keyword })),
    }));
  },
  async findExecution(instagramAccountId, instagramCommentId) {
    return prisma.automationExecution.findUnique({
      where: {
        instagramAccountId_instagramCommentId: {
          instagramAccountId,
          instagramCommentId,
        },
      },
      select: {
        id: true,
        status: true,
        automationId: true,
        instagramCommentId: true,
        matchedKeyword: true,
        messageText: true,
        errorMessage: true,
        errorCode: true,
      },
    });
  },
  async insertPendingExecution(input) {
    try {
      await prisma.automationExecution.create({
        data: {
          ...input,
          status: "pending",
        },
      });
      return "created";
    } catch (error) {
      if (isUniqueConflict(error)) {
        return "exists";
      }
      throw error;
    }
  },
  async updateExecution(instagramAccountId, instagramCommentId, input) {
    await prisma.automationExecution.update({
      where: {
        instagramAccountId_instagramCommentId: {
          instagramAccountId,
          instagramCommentId,
        },
      },
      data: input,
    });
  },
  async findAwaitingFollow(instagramAccountId, commenterInstagramId, since) {
    return prisma.automationExecution.findFirst({
      where: {
        instagramAccountId,
        commenterInstagramId,
        status: "awaiting_follow",
        createdAt: { gte: since },
      },
      orderBy: { createdAt: "desc" },
      select: {
        instagramCommentId: true,
        commenterUsername: true,
        automation: {
          select: {
            id: true,
            privateReplyMessage: true,
            notFollowingMessage: true,
          },
        },
      },
    });
  },
  async countUserSentThisMonth(userId) {
    const { start, end } = monthWindow();
    return prisma.automationExecution.count({
      where: {
        status: "sent",
        createdAt: { gte: start, lt: end },
        instagramAccount: { userId },
      },
    });
  },
  async claimReplySlot(userId, _planHint) {
    const { start, end } = monthWindow();
    return prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<
        Array<{
          replyUsageMonth: Date | null;
          replyUsageCount: number;
          email: string;
          plan: string;
          planExpiresAt: Date | null;
        }>
      >`SELECT "replyUsageMonth", "replyUsageCount", email, plan, "planExpiresAt" FROM "User" WHERE id = ${userId} FOR UPDATE`;
      const row = locked[0];
      if (!row) {
        return false;
      }
      if (isAdminEmail(row.email, getEnv().ADMIN_EMAILS)) {
        return true;
      }
      const effective = getEffectivePlan(row);
      if (normalizePlan(row.plan) !== "free" && effective === "free") {
        await tx.user.update({
          where: { id: userId },
          data: { plan: "free" },
        });
      }
      const limit = replyLimit(effective);
      const sameMonth =
        row.replyUsageMonth != null &&
        row.replyUsageMonth.getTime() === start.getTime();
      let used = sameMonth ? row.replyUsageCount : 0;
      if (!sameMonth) {
        used = await tx.automationExecution.count({
          where: {
            status: "sent",
            createdAt: { gte: start, lt: end },
            instagramAccount: { userId },
          },
        });
      }
      if (used >= limit) {
        return false;
      }
      await tx.user.update({
        where: { id: userId },
        data: { replyUsageMonth: start, replyUsageCount: used + 1 },
      });
      return true;
    });
  },
  async releaseReplySlot(userId) {
    const { start } = monthWindow();
    await prisma.$executeRaw`
      UPDATE "User"
      SET "replyUsageCount" = GREATEST("replyUsageCount" - 1, 0)
      WHERE id = ${userId} AND "replyUsageMonth" = ${start}
    `;
  },
};
