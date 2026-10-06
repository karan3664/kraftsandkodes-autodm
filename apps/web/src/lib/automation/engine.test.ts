import { encryptSecret } from "@kdl/shared/crypto";
import { MockInstagramClient } from "@kdl/instagram";
import { describe, expect, it, vi } from "vitest";
import { processIncomingComment, processIncomingMessage } from "./engine";
import { replyLimit } from "../plans";
import type {
  AutomationEngineStore,
  AwaitingFollow,
  ExecutionOutcome,
  EngineAccount,
  EngineAutomation,
  EngineExecution,
  EngineMedia,
  ExecutionDraft,
} from "./engine-store";

const KEY = "test-encryption-key-123456";

class MemoryStore implements AutomationEngineStore {
  processed = new Set<string>();
  errors = new Map<string, string>();
  account: EngineAccount | null = null;
  media = new Map<string, EngineMedia>();
  automations: Array<EngineAutomation & { mediaId: string; enabled: boolean }> =
    [];
  executions: EngineExecution[] = [];
  commenters = new Map<string, string | undefined>();
  sentThisMonth = 0;
  private seenEvents = new Set<string>();
  async countUserSentThisMonth() {
    return this.sentThisMonth;
  }
  async claimReplySlot(_userId: string, plan: string) {
    if (this.sentThisMonth >= replyLimit(plan)) {
      return false;
    }
    this.sentThisMonth += 1;
    return true;
  }
  async releaseReplySlot() {
    this.sentThisMonth = Math.max(0, this.sentThisMonth - 1);
  }

  async insertWebhookEvent(input: {
    eventId: string;
  }): Promise<"created" | "exists"> {
    if (this.seenEvents.has(input.eventId)) {
      return "exists";
    }
    this.seenEvents.add(input.eventId);
    return "created";
  }
  async webhookProcessed(eventId: string) {
    return this.processed.has(eventId);
  }
  async markWebhook(
    eventId: string,
    input: { processed: boolean; processingError?: string | null },
  ) {
    if (input.processed) {
      this.processed.add(eventId);
    }
    if (input.processingError) {
      this.errors.set(eventId, input.processingError);
    }
  }
  async findAccount() {
    return this.account;
  }
  async findMedia(instagramAccountId: string, instagramMediaId: string) {
    return this.media.get(`${instagramAccountId}:${instagramMediaId}`) ?? null;
  }
  async findEnabledAutomations(_accountId: string, mediaId: string) {
    return this.automations.filter(
      (item) => item.enabled && item.mediaId === mediaId,
    );
  }
  async findExecution(_accountId: string, instagramCommentId: string) {
    return (
      this.executions.find(
        (item) => item.instagramCommentId === instagramCommentId,
      ) ?? null
    );
  }
  async insertPendingExecution(
    input: ExecutionDraft,
  ): Promise<"created" | "exists"> {
    if (
      this.executions.some(
        (item) => item.instagramCommentId === input.instagramCommentId,
      )
    ) {
      return "exists";
    }
    this.commenters.set(input.instagramCommentId, input.commenterInstagramId);
    this.executions.push({
      id: `exec_${this.executions.length + 1}`,
      status: "pending",
      automationId: input.automationId,
      instagramCommentId: input.instagramCommentId,
      matchedKeyword: input.matchedKeyword,
      messageText: input.messageText,
      errorMessage: null,
      errorCode: null,
    });
    return "created";
  }
  async updateExecution(
    _accountId: string,
    instagramCommentId: string,
    input: {
      status: ExecutionOutcome;
      errorMessage: string | null;
      errorCode: string | null;
    },
  ) {
    const execution = this.executions.find(
      (item) => item.instagramCommentId === instagramCommentId,
    );
    if (!execution) {
      throw new Error("missing execution");
    }
    execution.status = input.status;
    execution.errorMessage = input.errorMessage;
    execution.errorCode = input.errorCode;
  }
  async findAwaitingFollow(
    _accountId: string,
    commenterInstagramId: string,
  ): Promise<AwaitingFollow | null> {
    const execution = this.executions.find(
      (item) =>
        item.status === "awaiting_follow" &&
        this.commenters.get(item.instagramCommentId) === commenterInstagramId,
    );
    const automation = this.automations.find(
      (item) => item.id === execution?.automationId,
    );
    if (!execution || !automation) {
      return null;
    }
    return {
      instagramCommentId: execution.instagramCommentId,
      commenterUsername: "sindhisetu",
      automation: {
        id: automation.id,
        privateReplyMessage: automation.privateReplyMessage,
        notFollowingMessage: null,
      },
    };
  }
}

function seedStore() {
  const store = new MemoryStore();
  store.account = {
    id: "acc_1",
    userId: "user_1",
    plan: "pro",
    instagramUserId: "ig_mock_account_001",
    username: "kraftsandkodes",
    accessTokenEncrypted: encryptSecret("mock-access-token", KEY),
  };
  store.media.set("acc_1:media_train_reel", {
    id: "media_row",
    instagramMediaId: "media_train_reel",
  });
  store.media.set("acc_1:media_other", {
    id: "media_other",
    instagramMediaId: "media_other",
  });
  store.automations.push({
    id: "auto_train",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    matchType: "contains",
    actionType: "private_reply",
    caseSensitive: false,
    privateReplyMessage: "Here's your train link!",
    requireFollow: false,
    followPromptMessage: null,
    commentReplyMessage: null,
    ignoreOwnComments: true,
    keywords: [{ keyword: "TRAIN" }, { keyword: "TRAIN LINK" }],
    mediaId: "media_row",
    enabled: true,
  });
  return store;
}

function comment(
  overrides: Partial<Parameters<typeof processIncomingComment>[0]> = {},
) {
  return {
    eventId: "evt_1",
    instagramUserId: "ig_mock_account_001",
    instagramMediaId: "media_train_reel",
    commentId: "comment_1",
    commentText: "train please",
    commenterUsername: "tester",
    ...overrides,
  };
}

describe("mock automation flow", () => {
  it("matches a reel keyword, sends one private reply, and records success", async () => {
    const store = seedStore();
    const client = new MockInstagramClient();
    const send = vi.spyOn(client, "sendPrivateReply");
    const result = await processIncomingComment(comment(), {
      store,
      client,
      encryptionKey: KEY,
    });

    expect(result).toMatchObject({
      status: "sent",
      automationId: "auto_train",
      matchedKeyword: "TRAIN",
    });
    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        commentId: "comment_1",
        text: "Here's your train link!",
      }),
    );
    expect(store.executions[0]).toMatchObject({
      status: "sent",
      matchedKeyword: "TRAIN",
      messageText: "Here's your train link!",
    });
  });

  it("does not match an automation that belongs to another reel", async () => {
    const store = seedStore();
    const client = new MockInstagramClient();
    const send = vi.spyOn(client, "sendPrivateReply");
    const result = await processIncomingComment(
      comment({
        eventId: "evt_other",
        instagramMediaId: "media_other",
        commentId: "comment_other",
      }),
      { store, client, encryptionKey: KEY },
    );
    expect(result.status).toBe("no_match");
    expect(send).not.toHaveBeenCalled();
    expect(store.executions).toHaveLength(0);
  });

  it("sends one reply when several keywords on the same automation match", async () => {
    const store = seedStore();
    const client = new MockInstagramClient();
    const send = vi.spyOn(client, "sendPrivateReply");
    const result = await processIncomingComment(
      comment({ commentText: "need TRAIN LINK" }),
      { store, client, encryptionKey: KEY },
    );
    expect(result).toMatchObject({
      status: "sent",
      matchedKeyword: "TRAIN LINK",
    });
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("prefers the exact automation, then the oldest, and records that automation", async () => {
    const store = seedStore();
    store.automations.push({
      id: "auto_exact_newer",
      createdAt: new Date("2026-02-01T00:00:00.000Z"),
      matchType: "exact",
      actionType: "private_reply",
      caseSensitive: false,
      privateReplyMessage: "Exact newer",
      requireFollow: false,
      followPromptMessage: null,
      commentReplyMessage: null,
      ignoreOwnComments: true,
      keywords: [{ keyword: "TRAIN" }],
      mediaId: "media_row",
      enabled: true,
    });
    store.automations.push({
      id: "auto_exact_older",
      createdAt: new Date("2025-01-01T00:00:00.000Z"),
      matchType: "exact",
      actionType: "private_reply",
      caseSensitive: false,
      privateReplyMessage: "Exact older",
      requireFollow: false,
      followPromptMessage: null,
      commentReplyMessage: null,
      ignoreOwnComments: true,
      keywords: [{ keyword: "TRAIN" }],
      mediaId: "media_row",
      enabled: true,
    });
    const client = new MockInstagramClient();
    const result = await processIncomingComment(
      comment({ commentText: "TRAIN" }),
      {
        store,
        client,
        encryptionKey: KEY,
      },
    );
    expect(result).toMatchObject({
      status: "sent",
      automationId: "auto_exact_older",
    });
    expect(store.executions[0]?.messageText).toBe("Exact older");
  });

  it("ignores a duplicate webhook event and a duplicate comment", async () => {
    const store = seedStore();
    const client = new MockInstagramClient();
    const send = vi.spyOn(client, "sendPrivateReply");
    const deps = { store, client, encryptionKey: KEY };
    await processIncomingComment(comment(), deps);
    const duplicateEvent = await processIncomingComment(comment(), deps);
    const duplicateComment = await processIncomingComment(
      comment({ eventId: "evt_2" }),
      deps,
    );
    expect(duplicateEvent.status).toBe("duplicate");
    expect(duplicateComment.status).toBe("duplicate");
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("records a failed execution when the private reply fails", async () => {
    const store = seedStore();
    const client = new MockInstagramClient({ failReply: true });
    const result = await processIncomingComment(comment(), {
      store,
      client,
      encryptionKey: KEY,
    });
    expect(result.status).toBe("failed");
    expect(store.executions[0]).toMatchObject({
      status: "failed",
      errorCode: "MESSAGE_SEND_FAILED",
      errorMessage: "Message could not be sent.",
    });
  });

  it("does not reply when the comment does not match", async () => {
    const store = seedStore();
    const client = new MockInstagramClient();
    const send = vi.spyOn(client, "sendPrivateReply");
    const result = await processIncomingComment(
      comment({
        eventId: "evt_hello",
        commentId: "comment_hello",
        commentText: "hello",
      }),
      {
        store,
        client,
        encryptionKey: KEY,
      },
    );
    expect(result.status).toBe("no_match");
    expect(send).not.toHaveBeenCalled();
    expect(store.executions).toHaveLength(0);
  });

  it("records an expired token without exposing the token", async () => {
    const store = seedStore();
    const client = new MockInstagramClient({ expired: true });
    const result = await processIncomingComment(comment(), {
      store,
      client,
      encryptionKey: KEY,
    });
    expect(result.status).toBe("failed");
    expect(store.executions[0]?.errorMessage).toBe(
      "Instagram connection expired. Please reconnect your account.",
    );
    expect(store.executions[0]?.errorCode).toBe("INVALID_TOKEN");
    expect(JSON.stringify(store.executions)).not.toContain("mock-access-token");
  });

  it("asks a commenter to follow first, then sends the link only after they follow", async () => {
    const store = seedStore();
    store.automations[0]!.requireFollow = true;
    store.automations[0]!.followPromptMessage =
      "Hi @username, please follow {account} and reply Done.";
    store.automations[0]!.commentReplyMessage = "@username check your dm!";
    const client = new MockInstagramClient();
    const send = vi.spyOn(client, "sendPrivateReply");
    const deps = { store, client, encryptionKey: KEY };

    const commented = await processIncomingComment(
      comment({
        commenterInstagramId: "igsid_1",
        commenterUsername: "sindhisetu",
      }),
      deps,
    );
    expect(commented.status).toBe("awaiting_follow");
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        text: "Hi @sindhisetu, please follow @kraftsandkodes and reply Done.",
      }),
    );
    expect(client.replies).toEqual([
      { commentId: "comment_1", text: "@sindhisetu check your dm!" },
    ]);

    const notYet = await processIncomingMessage(
      {
        eventId: "msg:1",
        instagramUserId: "ig_mock_account_001",
        senderId: "igsid_1",
      },
      deps,
    );
    expect(notYet.status).toBe("awaiting_follow");
    expect(client.directMessages[0]?.text).toContain(
      "aren't following @kraftsandkodes",
    );
    expect(client.directMessages[0]?.text).not.toContain("train link");

    client.following.add("igsid_1");
    const followed = await processIncomingMessage(
      {
        eventId: "msg:2",
        instagramUserId: "ig_mock_account_001",
        senderId: "igsid_1",
      },
      deps,
    );
    expect(followed.status).toBe("sent");
    expect(client.directMessages[1]).toEqual({
      recipientId: "igsid_1",
      text: "Here's your train link!",
    });
    expect(store.executions[0]?.status).toBe("sent");

    const again = await processIncomingMessage(
      {
        eventId: "msg:3",
        instagramUserId: "ig_mock_account_001",
        senderId: "igsid_1",
      },
      deps,
    );
    expect(again.status).toBe("no_pending");
    expect(client.directMessages).toHaveLength(2);
  });

  it("sends the link immediately when they already follow", async () => {
    const store = seedStore();
    store.automations[0]!.requireFollow = true;
    store.automations[0]!.followPromptMessage =
      "Hi @username, please follow {account} and reply Done.";
    store.automations[0]!.commentReplyMessage = "@username check your dm!";
    const client = new MockInstagramClient();
    client.following.add("igsid_follower");
    const send = vi.spyOn(client, "sendPrivateReply");
    const result = await processIncomingComment(
      comment({
        commenterInstagramId: "igsid_follower",
        commenterUsername: "thetrendbeginner",
      }),
      { store, client, encryptionKey: KEY },
    );
    expect(result.status).toBe("sent");
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ text: "Here's your train link!" }),
    );
    expect(send.mock.calls[0]?.[0]?.text).not.toContain("please follow");
    expect(client.replies).toEqual([
      { commentId: "comment_1", text: "@thetrendbeginner check your dm!" },
    ]);
  });

  it("skips the private reply when the monthly plan cap is reached", async () => {
    const store = seedStore();
    store.account!.plan = "free";
    store.sentThisMonth = 100;
    const client = new MockInstagramClient();
    const send = vi.spyOn(client, "sendPrivateReply");
    const result = await processIncomingComment(comment(), {
      store,
      client,
      encryptionKey: KEY,
    });
    expect(result.status).toBe("skipped");
    expect(send).not.toHaveBeenCalled();
    expect(store.executions[0]?.errorCode).toBe("PLAN_REPLY_LIMIT");
  });

  it("blocks the 101st free reply and does not send", async () => {
    const store = seedStore();
    store.account!.plan = "free";
    store.sentThisMonth = 100;
    const client = new MockInstagramClient();
    const send = vi.spyOn(client, "sendPrivateReply");
    const results = await Promise.all(
      Array.from({ length: 5 }, (_, index) =>
        processIncomingComment(
          comment({
            eventId: `evt_race_${index}`,
            commentId: `comment_race_${index}`,
          }),
          { store, client, encryptionKey: KEY },
        ),
      ),
    );
    expect(results.every((row) => row.status === "skipped")).toBe(true);
    expect(send).not.toHaveBeenCalled();
  });

  it.each([
    ["free", 100],
    ["creator", 5_000],
    ["pro", 20_000],
    ["agency", 50_000],
  ] as const)("blocks %s replies past %s", async (plan, cap) => {
    const store = seedStore();
    store.account!.plan = plan;
    store.sentThisMonth = cap;
    const client = new MockInstagramClient();
    const send = vi.spyOn(client, "sendPrivateReply");
    const result = await processIncomingComment(
      comment({ eventId: `evt_${plan}`, commentId: `c_${plan}` }),
      { store, client, encryptionKey: KEY },
    );
    expect(result.status).toBe("skipped");
    expect(send).not.toHaveBeenCalled();
  });

  it.each([
    ["free", 100],
    ["creator", 5_000],
    ["pro", 20_000],
    ["agency", 50_000],
  ] as const)(
    "allows the last %s reply at %s then blocks",
    async (plan, cap) => {
      const store = seedStore();
      store.account!.plan = plan;
      store.sentThisMonth = cap - 1;
      const client = new MockInstagramClient();
      const allowed = await processIncomingComment(
        comment({ eventId: `evt_last_${plan}`, commentId: `c_last_${plan}` }),
        { store, client, encryptionKey: KEY },
      );
      expect(allowed.status).toBe("sent");
      const blocked = await processIncomingComment(
        comment({ eventId: `evt_over_${plan}`, commentId: `c_over_${plan}` }),
        { store, client, encryptionKey: KEY },
      );
      expect(blocked.status).toBe("skipped");
      expect(store.sentThisMonth).toBe(cap);
    },
  );

  it("serializes concurrent claims so free cannot exceed 100", async () => {
    const store = seedStore();
    store.account!.plan = "free";
    store.sentThisMonth = 0;
    const client = new MockInstagramClient();
    const results = await Promise.all(
      Array.from({ length: 102 }, (_, index) =>
        processIncomingComment(
          comment({
            eventId: `evt_cap_${index}`,
            commentId: `comment_cap_${index}`,
          }),
          { store, client, encryptionKey: KEY },
        ),
      ),
    );
    expect(results.filter((row) => row.status === "sent")).toHaveLength(100);
    expect(results.filter((row) => row.status === "skipped")).toHaveLength(2);
    expect(store.sentThisMonth).toBe(100);
  });

  it("does not keep usage when the private reply fails", async () => {
    const store = seedStore();
    store.account!.plan = "free";
    const client = new MockInstagramClient();
    vi.spyOn(client, "sendPrivateReply").mockRejectedValueOnce(
      new Error("meta down"),
    );
    const result = await processIncomingComment(comment(), {
      store,
      client,
      encryptionKey: KEY,
    });
    expect(result.status).toBe("failed");
    expect(store.sentThisMonth).toBe(0);
  });

  it("skips comments from the connected account", async () => {
    const store = seedStore();
    const client = new MockInstagramClient();
    const send = vi.spyOn(client, "sendPrivateReply");
    const result = await processIncomingComment(
      comment({
        commenterInstagramId: "ig_mock_account_001",
        commenterUsername: "kraftsandkodes",
      }),
      { store, client, encryptionKey: KEY },
    );
    expect(result.status).toBe("skipped");
    expect(send).not.toHaveBeenCalled();
  });

  it("sends a public comment reply without a private DM", async () => {
    const store = seedStore();
    store.automations[0]!.actionType = "comment_reply";
    store.automations[0]!.commentReplyMessage = "Check the caption!";
    const client = new MockInstagramClient();
    const dm = vi.spyOn(client, "sendPrivateReply");
    const pub = vi.spyOn(client, "replyToComment");
    const result = await processIncomingComment(comment(), {
      store,
      client,
      encryptionKey: KEY,
    });
    expect(result.status).toBe("sent");
    expect(dm).not.toHaveBeenCalled();
    expect(pub).toHaveBeenCalledTimes(1);
  });
});
