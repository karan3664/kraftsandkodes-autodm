import { prisma, type Prisma } from "@kdl/db";
import { normalizeKeyword, type AutomationInput } from "@kdl/shared";
import { canEnableAnotherAutomation, getEffectivePlan } from "@/lib/plans";
import { isAdmin } from "@/lib/auth/admin";

export function keywordRows(keywords: string[], caseSensitive: boolean) {
  const seen = new Set<string>();
  const rows: Array<{ keyword: string; normalizedKeyword: string }> = [];
  for (const raw of keywords) {
    const keyword = raw.normalize("NFKC").trim().replace(/\s+/gu, " ");
    const normalizedKeyword = normalizeKeyword(keyword, caseSensitive);
    if (!normalizedKeyword || seen.has(normalizedKeyword)) {
      continue;
    }
    seen.add(normalizedKeyword);
    rows.push({ keyword, normalizedKeyword });
  }
  return rows;
}

export class ActiveAutomationLimitError extends Error {
  constructor() {
    super("Free plan includes 1 active automation.");
    this.name = "ActiveAutomationLimitError";
  }
}

async function assertCanEnable(
  tx: Prisma.TransactionClient,
  userId: string,
  exceptId?: string,
) {
  const user = await tx.user.findUnique({
    where: { id: userId },
    select: { plan: true, planExpiresAt: true, email: true },
  });
  if (user && isAdmin(user)) {
    return;
  }
  const plan = getEffectivePlan(user ?? {});
  if (user && user.plan !== "free" && plan === "free") {
    await tx.user.update({
      where: { id: userId },
      data: { plan: "free" },
    });
  }
  const used = await tx.automation.count({
    where: {
      userId,
      enabled: true,
      ...(exceptId ? { id: { not: exceptId } } : {}),
    },
  });
  if (!canEnableAnotherAutomation(used, plan)) {
    throw new ActiveAutomationLimitError();
  }
}

function storedMatchType(
  matchType: AutomationInput["matchType"],
): "exact" | "contains" {
  return matchType === "exact" ? "exact" : "contains";
}

function storedKeywords(
  input: Pick<AutomationInput, "matchType" | "keywords">,
) {
  if (input.matchType === "all_comments") {
    return input.keywords.length === 0 ? ["*"] : input.keywords;
  }
  return input.keywords;
}

export async function createAutomation(userId: string, input: AutomationInput) {
  const rows = keywordRows(storedKeywords(input), input.caseSensitive);
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`;
    if (input.enabled) {
      await assertCanEnable(tx, userId);
    }
    const created = await tx.automation.create({
      data: {
        userId,
        instagramAccountId: input.instagramAccountId,
        mediaId: input.mediaId,
        name: input.name,
        actionType: input.actionType,
        matchType: storedMatchType(input.matchType),
        caseSensitive: input.caseSensitive,
        privateReplyMessage: input.privateReplyMessage,
        requireFollow:
          input.actionType === "comment_reply" ? false : input.requireFollow,
        followPromptMessage: input.followPromptMessage,
        notFollowingMessage: input.notFollowingMessage,
        commentReplyMessage: input.commentReplyMessage || null,
        actionConfig: {
          message: input.privateReplyMessage,
        } satisfies Prisma.InputJsonValue,
        enabled: input.enabled,
        keywords: { create: rows },
      },
      include: { keywords: true, media: true },
    });
    if (input.ignoreOwnComments === false) {
      await tx.$executeRaw`UPDATE "Automation" SET "ignoreOwnComments" = false WHERE id = ${created.id}`;
    }
    return created;
  });
}

export async function updateAutomation(
  automationId: string,
  input: Partial<AutomationInput>,
) {
  const data: Prisma.AutomationUpdateInput = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.matchType !== undefined)
    data.matchType = storedMatchType(input.matchType);
  if (input.caseSensitive !== undefined)
    data.caseSensitive = input.caseSensitive;
  if (input.privateReplyMessage !== undefined) {
    data.privateReplyMessage = input.privateReplyMessage;
    data.actionConfig = { message: input.privateReplyMessage };
  }
  if (input.requireFollow !== undefined)
    data.requireFollow = input.requireFollow;
  if (input.followPromptMessage !== undefined) {
    data.followPromptMessage = input.followPromptMessage;
  }
  if (input.notFollowingMessage !== undefined) {
    data.notFollowingMessage = input.notFollowingMessage;
  }
  if (input.commentReplyMessage !== undefined) {
    data.commentReplyMessage = input.commentReplyMessage || null;
  }
  if (input.enabled !== undefined) data.enabled = input.enabled;
  if (input.actionType !== undefined) data.actionType = input.actionType;
  if (input.instagramAccountId !== undefined) {
    data.instagramAccount = { connect: { id: input.instagramAccountId } };
  }
  if (input.mediaId !== undefined) {
    data.media = { connect: { id: input.mediaId } };
  }

  return prisma.$transaction(async (tx) => {
    const current = await tx.automation.findUniqueOrThrow({
      where: { id: automationId },
    });
    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${current.userId} FOR UPDATE`;
    if (input.enabled === true && !current.enabled) {
      await assertCanEnable(tx, current.userId, automationId);
    }
    const automation = await tx.automation.update({
      where: { id: automationId },
      data,
    });
    if (input.ignoreOwnComments !== undefined) {
      await tx.$executeRaw`UPDATE "Automation" SET "ignoreOwnComments" = ${input.ignoreOwnComments} WHERE id = ${automationId}`;
    }

    if (input.keywords || input.matchType === "all_comments") {
      const caseSensitive = input.caseSensitive ?? automation.caseSensitive;
      const source = storedKeywords({
        matchType:
          input.matchType ??
          (automation.matchType === "exact" ? "exact" : "contains"),
        keywords: input.keywords ?? [],
      });
      await tx.automationKeyword.deleteMany({ where: { automationId } });
      await tx.automationKeyword.createMany({
        data: keywordRows(source, caseSensitive).map((row) => ({
          ...row,
          automationId,
        })),
      });
    }

    return tx.automation.findUniqueOrThrow({
      where: { id: automationId },
      include: { keywords: true, media: true },
    });
  });
}
