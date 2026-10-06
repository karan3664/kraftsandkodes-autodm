export const DEFAULT_MESSAGES = {
  followPrompt:
    'Hi @username, thank you for your interest! 🙌\n\nThis link is available exclusively to our followers. Please follow {account}, then reply "Done" to this message and we\'ll send it to you right away.',
  notFollowing:
    'Thanks for your reply, @username! It looks like you aren\'t following {account} yet.\n\nPlease follow the account and reply "Done" again — your link will be sent instantly.',
  link: "Thank you, @username! 🎉\n\nHere's the link you requested: https://example.com/train",
  commentReply:
    "@username Thank you for your comment! We've sent the details to your DMs 📩",
} as const;

function mention(handle?: string | null): string {
  const clean = handle?.replace(/^@/, "").trim();
  return clean ? `@${clean}` : "";
}

/** Fills @username / {username} with the commenter and {account} with the business handle. */
export function renderTemplate(
  template: string | null | undefined,
  values: { username?: string | null; account?: string | null },
): string {
  return (template ?? "")
    .replaceAll("@username", mention(values.username))
    .replaceAll("{username}", mention(values.username))
    .replaceAll("{account}", mention(values.account))
    .replace(/[ \t]{2,}/g, " ")
    .replace(/ +([,!.?])/g, "$1")
    .trim();
}
