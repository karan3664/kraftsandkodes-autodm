import {
  DEFAULT_MESSAGES,
  renderTemplate,
  selectAutomationMatch,
} from "@kdl/shared";
import { decryptSecret } from "@kdl/shared/crypto";
import { InstagramApiError, type InstagramClient } from "@kdl/instagram";
import { createHash } from "node:crypto";
import { getEnv } from "../env";
import { getInstagramClient } from "../instagram";
import { logger } from "../logger";
import {
  prismaEngineStore,
  type AutomationEngineStore,
  type ExecutionOutcome,
} from "./engine-store";

export type IncomingComment = {
  eventId: string;
  instagramUserId: string;
  instagramMediaId?: string;
  commentId: string;
  commentText: string;
  commenterUsername?: string;
  commenterInstagramId?: string;
};

export type EngineDependencies = {
  store: AutomationEngineStore;
  client: InstagramClient;
  encryptionKey: string;
};

export async function processIncomingComment(
  input: IncomingComment,
  dependencies: EngineDependencies = defaultDependencies(),
) {
  const payloadHash = createHash("sha256")
    .update(JSON.stringify(input))
    .digest("hex");
  const inserted = await dependencies.store.insertWebhookEvent({
    eventId: input.eventId,
    payloadHash,
  });
  if (
    inserted === "exists" &&
    (await dependencies.store.webhookProcessed(input.eventId))
  ) {
    logger.info("webhook_duplicate", { eventId: input.eventId });
    return { status: "duplicate" as const };
  }

  try {
    return await handleComment(input, dependencies);
  } catch (error) {
    await dependencies.store
      .markWebhook(input.eventId, {
        processed: false,
        processingError: "Webhook processing failed.",
      })
      .catch(() => undefined);
    logger.error("webhook_processing_failed", { eventId: input.eventId });
    throw error;
  }
}

async function handleComment(
  input: IncomingComment,
  dependencies: EngineDependencies,
) {
  const account = await dependencies.store.findAccount(input.instagramUserId);
  if (!account) {
    await dependencies.store.markWebhook(input.eventId, { processed: true });
    logger.info("webhook_unknown_account", { eventId: input.eventId });
    return { status: "unknown_account" as const };
  }

  if (!input.instagramMediaId) {
    await dependencies.store.markWebhook(input.eventId, {
      processed: true,
      processingError: "Comment did not include a media id.",
    });
    logger.info("webhook_missing_media", {
      eventId: input.eventId,
      instagramAccountId: account.id,
    });
    return { status: "missing_media" as const };
  }

  const media = await dependencies.store.findMedia(
    account.id,
    input.instagramMediaId,
  );
  if (!media) {
    await dependencies.store.markWebhook(input.eventId, { processed: true });
    logger.info("webhook_media_not_tracked", {
      eventId: input.eventId,
      instagramAccountId: account.id,
    });
    return { status: "media_not_tracked" as const };
  }

  const existing = await dependencies.store.findExecution(
    account.id,
    input.commentId,
  );
  if (existing && existing.status !== "pending") {
    await dependencies.store.markWebhook(input.eventId, { processed: true });
    return { status: "duplicate" as const };
  }

  const automations = await dependencies.store.findEnabledAutomations(
    account.id,
    media.id,
  );
  const selected = selectAutomationMatch(
    input.commentText,
    automations.map((automation) => ({
      id: automation.id,
      createdAt: automation.createdAt.getTime(),
      matchType: automation.matchType,
      caseSensitive: automation.caseSensitive,
      keywords: automation.keywords.map((keyword) => keyword.keyword),
    })),
  );
  const matched = selected
    ? automations.find((automation) => automation.id === selected.automationId)
    : undefined;

  if (!matched || !selected) {
    await dependencies.store.markWebhook(input.eventId, { processed: true });
    logger.info("webhook_no_match", {
      eventId: input.eventId,
      instagramAccountId: account.id,
    });
    return { status: "no_match" as const };
  }

  if (matched.ignoreOwnComments && isOwnComment(account, input)) {
    await dependencies.store.markWebhook(input.eventId, { processed: true });
    logger.info("webhook_own_comment", {
      eventId: input.eventId,
      instagramAccountId: account.id,
    });
    return { status: "skipped" as const, automationId: matched.id };
  }

  if (!existing) {
    const insertedExecution = await dependencies.store.insertPendingExecution({
      automationId: matched.id,
      instagramAccountId: account.id,
      instagramMediaId: input.instagramMediaId,
      instagramCommentId: input.commentId,
      commenterInstagramId: input.commenterInstagramId,
      commenterUsername: input.commenterUsername,
      commentText: input.commentText,
      matchedKeyword: selected.matchedKeyword,
      messageText:
        matched.actionType === "comment_reply"
          ? (matched.commentReplyMessage ?? matched.privateReplyMessage)
          : matched.privateReplyMessage,
    });
    if (insertedExecution === "exists") {
      const raced = await dependencies.store.findExecution(
        account.id,
        input.commentId,
      );
      if (raced && raced.status !== "pending") {
        await dependencies.store.markWebhook(input.eventId, {
          processed: true,
        });
        return { status: "duplicate" as const };
      }
    }
  }

  const names = {
    username: input.commenterUsername,
    account: account.username,
  };
  let status: ExecutionOutcome = "sent";
  let errorMessage: string | null = null;
  let errorCode: string | null = null;
  let httpStatus: number | null = 200;
  let claimed = false;
  try {
    if (
      matched.requireFollow &&
      matched.actionType !== "comment_reply" &&
      !input.commenterInstagramId
    ) {
      throw new InstagramApiError(
        "Comment did not include the commenter id needed for the follow check.",
        400,
        "FOLLOW_CHECK_FAILED",
      );
    }
    const accessToken = decryptSecret(
      account.accessTokenEncrypted,
      dependencies.encryptionKey,
    );
    let alreadyFollows = false;
    if (
      matched.requireFollow &&
      matched.actionType !== "comment_reply" &&
      input.commenterInstagramId
    ) {
      try {
        alreadyFollows = await dependencies.client.followsBusiness(
          accessToken,
          input.commenterInstagramId,
        );
      } catch {
        alreadyFollows = false;
      }
    }
    const commentOnly = matched.actionType === "comment_reply";
    const sendLinkNow = commentOnly || !matched.requireFollow || alreadyFollows;
    if (sendLinkNow) {
      claimed = await dependencies.store.claimReplySlot(
        account.userId,
        account.plan,
      );
      if (!claimed) {
        await dependencies.store.updateExecution(account.id, input.commentId, {
          status: "skipped",
          httpStatus: 402,
          errorMessage: "Monthly automated reply limit reached.",
          errorCode: "PLAN_REPLY_LIMIT",
        });
        await dependencies.store.markWebhook(input.eventId, {
          processed: true,
        });
        return { status: "skipped" as const, automationId: matched.id };
      }
    }
    status = sendLinkNow ? "sent" : "awaiting_follow";
    if (!commentOnly) {
      await dependencies.client.sendPrivateReply({
        accessToken,
        instagramUserId: account.instagramUserId,
        commentId: input.commentId,
        text: renderTemplate(
          sendLinkNow
            ? matched.privateReplyMessage
            : (matched.followPromptMessage ?? DEFAULT_MESSAGES.followPrompt),
          names,
        ),
      });
    }
    const publicReply = renderTemplate(matched.commentReplyMessage, names);
    if (publicReply) {
      try {
        await dependencies.client.replyToComment({
          accessToken,
          commentId: input.commentId,
          text: publicReply,
        });
      } catch (error) {
        if (commentOnly) {
          throw error;
        }
        errorCode = "COMMENT_REPLY_FAILED";
        errorMessage = "Private reply sent. The public comment reply failed.";
        logger.error("comment_reply_failed", {
          eventId: input.eventId,
          instagramAccountId: account.id,
          automationId: matched.id,
          errorCode,
          ...metaFields(error),
        });
      }
    }
  } catch (error) {
    if (claimed) {
      await dependencies.store.releaseReplySlot(account.userId);
    }
    status = "failed";
    httpStatus = error instanceof InstagramApiError ? error.status : 500;
    errorCode =
      error instanceof InstagramApiError ? error.code : "MESSAGE_SEND_FAILED";
    errorMessage =
      error instanceof InstagramApiError
        ? error.message
        : "Message could not be sent.";
    logger.error("private_reply_failed", {
      eventId: input.eventId,
      instagramAccountId: account.id,
      automationId: matched.id,
      executionStatus: status,
      errorCode,
      httpStatus,
      ...metaFields(error),
    });
  }

  await dependencies.store.updateExecution(account.id, input.commentId, {
    status,
    httpStatus,
    errorMessage,
    errorCode,
  });
  await dependencies.store.markWebhook(input.eventId, {
    processed: true,
    processingError: null,
  });
  logger.info("automation_executed", {
    eventId: input.eventId,
    instagramAccountId: account.id,
    automationId: matched.id,
    executionStatus: status,
  });

  return {
    status,
    automationId: matched.id,
    matchedKeyword: selected.matchedKeyword,
  };
}

export type IncomingMessage = {
  eventId: string;
  instagramUserId: string;
  senderId: string;
};

const PRIVATE_REPLY_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

/** A DM reply from someone we prompted to follow: check follow, then send the link. */
export async function processIncomingMessage(
  input: IncomingMessage,
  dependencies: EngineDependencies = defaultDependencies(),
) {
  const { store, client } = dependencies;
  const inserted = await store.insertWebhookEvent({
    eventId: input.eventId,
    payloadHash: createHash("sha256")
      .update(JSON.stringify(input))
      .digest("hex"),
  });
  if (inserted === "exists" && (await store.webhookProcessed(input.eventId))) {
    return { status: "duplicate" as const };
  }

  try {
    const account = await store.findAccount(input.instagramUserId);
    const awaiting =
      account && input.senderId !== account.instagramUserId
        ? await store.findAwaitingFollow(
            account.id,
            input.senderId,
            new Date(Date.now() - PRIVATE_REPLY_WINDOW_MS),
          )
        : null;
    if (!account || !awaiting) {
      await store.markWebhook(input.eventId, { processed: true });
      return { status: "no_pending" as const };
    }

    const accessToken = decryptSecret(
      account.accessTokenEncrypted,
      dependencies.encryptionKey,
    );
    const names = {
      username: awaiting.commenterUsername,
      account: account.username,
    };
    const follows = await client.followsBusiness(accessToken, input.senderId);
    let claimed = false;
    if (follows) {
      claimed = await store.claimReplySlot(account.userId, account.plan);
      if (!claimed) {
        await store.markWebhook(input.eventId, { processed: true });
        return {
          status: "skipped" as const,
          automationId: awaiting.automation.id,
        };
      }
    }
    try {
      await client.sendDirectMessage({
        accessToken,
        instagramUserId: account.instagramUserId,
        recipientId: input.senderId,
        text: renderTemplate(
          follows
            ? awaiting.automation.privateReplyMessage
            : (awaiting.automation.notFollowingMessage ??
                DEFAULT_MESSAGES.notFollowing),
          names,
        ),
      });
    } catch (error) {
      if (claimed) {
        await store.releaseReplySlot(account.userId);
      }
      throw error;
    }
    if (follows) {
      await store.updateExecution(account.id, awaiting.instagramCommentId, {
        status: "sent",
        httpStatus: 200,
        errorMessage: null,
        errorCode: null,
      });
    }
    await store.markWebhook(input.eventId, { processed: true });
    logger.info("follow_gate_reply", {
      eventId: input.eventId,
      instagramAccountId: account.id,
      automationId: awaiting.automation.id,
      executionStatus: follows ? "sent" : "awaiting_follow",
    });
    return {
      status: follows ? ("sent" as const) : ("awaiting_follow" as const),
      automationId: awaiting.automation.id,
    };
  } catch (error) {
    await store
      .markWebhook(input.eventId, {
        processed: false,
        processingError: "Follow check reply failed.",
      })
      .catch(() => undefined);
    logger.error("follow_gate_failed", {
      eventId: input.eventId,
      ...metaFields(error),
    });
    throw error;
  }
}

function isOwnComment(
  account: { instagramUserId: string; username: string },
  input: IncomingComment,
) {
  if (
    input.commenterInstagramId &&
    input.commenterInstagramId === account.instagramUserId
  ) {
    return true;
  }
  const handle = input.commenterUsername?.replace(/^@/u, "").toLowerCase();
  return Boolean(handle && handle === account.username.toLowerCase());
}

function metaFields(error: unknown) {
  if (!(error instanceof InstagramApiError)) {
    return {};
  }
  return {
    errorCode: error.code,
    metaCode: error.graph?.code,
    metaSubcode: error.graph?.subcode,
    metaMessage: error.graph?.message,
  };
}

function defaultDependencies(): EngineDependencies {
  return {
    store: prismaEngineStore,
    client: getInstagramClient(),
    encryptionKey: getEnv().TOKEN_ENCRYPTION_KEY,
  };
}
