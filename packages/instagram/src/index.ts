import { createInstagramConfig, isInstagramConfigured } from "./config";
import { GraphInstagramClient } from "./graph-client";
import { MockInstagramClient } from "./mock-client";
import type { InstagramClient, InstagramConfig } from "./types";

export function createInstagramClient(
  env: {
    INSTAGRAM_MOCK_MODE?: string;
    NODE_ENV?: string;
  } & Parameters<typeof createInstagramConfig>[0],
): InstagramClient {
  if (env.INSTAGRAM_MOCK_MODE === "true") {
    if (env.NODE_ENV === "production") {
      throw new Error(
        "INSTAGRAM_MOCK_MODE cannot be enabled in production. Set INSTAGRAM_MOCK_MODE=false and configure the Meta app.",
      );
    }
    return new MockInstagramClient();
  }
  return new GraphInstagramClient(createInstagramConfig(env));
}

export { createInstagramConfig, isInstagramConfigured };
export { GraphInstagramClient } from "./graph-client";
export { MockInstagramClient } from "./mock-client";
export {
  classifyGraphError,
  missingBusinessScopes,
  readShortLivedToken,
  stripAuthorizationCode,
} from "./meta-errors";
export * from "./types";
export type { InstagramConfig };
