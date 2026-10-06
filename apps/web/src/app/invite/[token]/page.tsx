import { requireUser } from "@/lib/auth/session";
import { TeamError, previewInvite } from "@/lib/team/service";
import { InviteCard } from "./invite-card";

export default async function InvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ accept?: string }>;
}) {
  const { token } = await params;
  const query = await searchParams;
  const user = await requireUser();
  let preview:
    | { email: string; role: string; ownerName: string; expiresAt: string }
    | { error: string };
  try {
    if (!/^[0-9a-f]{64}$/i.test(token)) {
      throw new TeamError("NOT_FOUND", "This invitation is not valid.");
    }
    preview = await previewInvite(token);
  } catch (error) {
    preview = {
      error:
        error instanceof TeamError
          ? error.message
          : "This invitation is not valid.",
    };
  }

  return (
    <InviteCard
      token={token}
      preview={preview}
      signedInEmail={user?.email ?? null}
      autoAccept={query.accept === "1" && Boolean(user)}
    />
  );
}
