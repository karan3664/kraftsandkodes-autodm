export type IncomingCommentEvent = {
  eventId: string;
  instagramUserId: string;
  instagramMediaId?: string;
  commentId: string;
  commentText: string;
  commenterUsername?: string;
  commenterInstagramId?: string;
};

type CommentValue = {
  id?: string;
  text?: string;
  media?: { id?: string };
  from?: { id?: string; username?: string };
};

type Change = {
  field?: string;
  value?: CommentValue;
};

type Messaging = {
  sender?: { id?: string };
  recipient?: { id?: string };
  message?: { mid?: string; text?: string; is_echo?: boolean };
};

type Entry = {
  id?: string;
  time?: number;
  field?: string;
  value?: CommentValue;
  changes?: Change[];
  messaging?: Messaging[];
};

export type IncomingMessageEvent = {
  eventId: string;
  instagramUserId: string;
  senderId: string;
};

/** Inbound DMs (Instagram Login `messages` field). Echoes of our own sends are dropped. */
export function extractMessages(payload: unknown): IncomingMessageEvent[] {
  const body = payload as { entry?: Entry[] };
  return (body.entry ?? []).flatMap((entry) =>
    (entry.messaging ?? []).flatMap((item) => {
      const senderId = item.sender?.id;
      const mid = item.message?.mid;
      if (!entry.id || !senderId || !mid || item.message?.is_echo) {
        return [];
      }
      return [{ eventId: `msg:${mid}`, instagramUserId: entry.id, senderId }];
    }),
  );
}

export function extractComments(payload: unknown): IncomingCommentEvent[] {
  const events: IncomingCommentEvent[] = [];
  const body = payload as { entry?: Entry[] };

  for (const entry of body.entry ?? []) {
    const changes =
      entry.changes ??
      (entry.field ? [{ field: entry.field, value: entry.value }] : []);
    for (const change of changes) {
      if (change.field !== "comments" || !change.value?.id) {
        continue;
      }
      const commentId = change.value.id;
      events.push({
        eventId: `${entry.id ?? "ig"}:${commentId}:${entry.time ?? "0"}`,
        instagramUserId: entry.id ?? "",
        instagramMediaId: change.value.media?.id,
        commentId,
        commentText: change.value.text ?? "",
        commenterUsername: change.value.from?.username,
        commenterInstagramId: change.value.from?.id,
      });
    }
  }
  return events;
}
