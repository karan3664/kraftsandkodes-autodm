import { prisma } from "@kdl/db";
import { assertAccountId, type Workspace } from "../team/workspace";

export async function getOwnedAutomation(userId: string, automationId: string) {
  return prisma.automation.findFirst({
    where: { id: automationId, userId },
  });
}

export async function getOwnedInstagramAccount(
  userId: string,
  accountId: string,
) {
  return prisma.instagramAccount.findFirst({
    where: { id: accountId, userId },
  });
}

export async function getOwnedMedia(
  userId: string,
  mediaId: string,
  instagramAccountId: string,
) {
  return prisma.instagramMedia.findFirst({
    where: {
      id: mediaId,
      instagramAccountId,
      instagramAccount: { userId },
    },
  });
}

export async function getAccessibleInstagramAccount(
  ws: Workspace,
  accountId: string,
) {
  if (!assertAccountId(ws, accountId)) {
    return null;
  }
  return prisma.instagramAccount.findFirst({
    where: { id: accountId, userId: ws.ownerUserId },
  });
}

export async function getAccessibleAutomation(
  ws: Workspace,
  automationId: string,
) {
  const row = await prisma.automation.findFirst({
    where: { id: automationId, userId: ws.ownerUserId },
  });
  if (!row) {
    return null;
  }
  if (!assertAccountId(ws, row.instagramAccountId)) {
    return null;
  }
  return row;
}

export async function getAccessibleMedia(
  ws: Workspace,
  mediaId: string,
  instagramAccountId: string,
) {
  if (!assertAccountId(ws, instagramAccountId)) {
    return null;
  }
  return prisma.instagramMedia.findFirst({
    where: {
      id: mediaId,
      instagramAccountId,
      instagramAccount: { userId: ws.ownerUserId },
    },
  });
}
