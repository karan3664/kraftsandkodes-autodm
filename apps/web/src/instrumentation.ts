export async function register() {
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return;
  }
  if (process.env.NODE_ENV === "test") {
    return;
  }

  const mock = process.env.INSTAGRAM_MOCK_MODE === "true";
  if (process.env.NODE_ENV === "production" && mock) {
    throw new Error(
      "INSTAGRAM_MOCK_MODE cannot be enabled in production. Set INSTAGRAM_MOCK_MODE=false and configure the Meta app.",
    );
  }

  if (mock) {
    return;
  }

  const required = [
    "META_APP_ID",
    "META_APP_SECRET",
    "META_REDIRECT_URI",
    "META_WEBHOOK_VERIFY_TOKEN",
    "TOKEN_ENCRYPTION_KEY",
    "DATABASE_URL",
  ];
  const missing = required.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    throw new Error(
      `Instagram is not in mock mode and required configuration is missing: ${missing.join(", ")}`,
    );
  }

  if (process.env.NODE_ENV === "production") {
    const weak = [
      "dev-only-session-secret-change-me",
      "dev-only-encryption-key-change-me",
    ];
    if (
      weak.includes(process.env.SESSION_SECRET ?? "") ||
      weak.includes(process.env.TOKEN_ENCRYPTION_KEY ?? "")
    ) {
      throw new Error("Production secrets must not use development defaults.");
    }
  }
}
