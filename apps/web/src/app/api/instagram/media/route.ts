import { requireUser } from "@/lib/auth/session";
import { assertSameOrigin } from "@/lib/csrf";
import { jsonError, jsonOk } from "@/lib/http";
import { loadWorkspace } from "@/lib/team/workspace";
import { getAccessibleInstagramAccount } from "@/lib/auth/ownership";
import {
  mediaSyncErrorMessage,
  syncAccountMedia,
  toMediaPickerItem,
} from "@/lib/instagram-media";

export async function GET(request: Request) {
  const originError = assertSameOrigin(request);
  if (originError && request.headers.get("origin")) {
    return originError;
  }
  const user = await requireUser();
  if (!user) {
    return jsonError("UNAUTHORIZED", "You need to sign in to continue.", 401);
  }

  const accountId = new URL(request.url).searchParams.get("instagramAccountId");
  if (!accountId) {
    return jsonError("VALIDATION_ERROR", "Choose an Instagram account.", 400);
  }

  const ws = await loadWorkspace(user);
  const owned = await getAccessibleInstagramAccount(ws, accountId);
  if (!owned) {
    return jsonError(
      "FORBIDDEN",
      "That Instagram account does not belong to you.",
      403,
    );
  }

  try {
    const media = await syncAccountMedia(ws.ownerUserId, accountId);
    if (!media) {
      return jsonError(
        "FORBIDDEN",
        "That Instagram account does not belong to you.",
        403,
      );
    }
    return jsonOk({ media: media.map(toMediaPickerItem) });
  } catch (error) {
    const mapped = mediaSyncErrorMessage(error);
    return jsonError(mapped.code, mapped.message, mapped.status);
  }
}
