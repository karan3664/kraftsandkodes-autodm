import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  APP_URL: z.string().url().default("http://localhost:3000"),
  APP_NAME: z.string().default("KRAFTSANDKODES"),
  DATABASE_URL: z.string().min(1).optional(),
  REDIS_URL: z.string().min(1).optional(),
  SESSION_SECRET: z
    .string()
    .min(16)
    .default("dev-only-session-secret-change-me"),
  SESSION_COOKIE_NAME: z.string().default("autodm_session"),
  SESSION_TTL_DAYS: z.coerce.number().int().positive().default(14),
  TOKEN_ENCRYPTION_KEY: z
    .string()
    .min(16)
    .default("dev-only-encryption-key-change-me"),
  META_APP_ID: z.string().optional().default(""),
  META_APP_SECRET: z.string().optional().default(""),
  META_REDIRECT_URI: z.string().optional().default(""),
  META_API_VERSION: z.string().default("v23.0"),
  META_GRAPH_BASE_URL: z.string().default("https://graph.instagram.com"),
  META_AUTHORIZE_URL: z
    .string()
    .default("https://www.instagram.com/oauth/authorize"),
  META_OAUTH_TOKEN_URL: z
    .string()
    .default("https://api.instagram.com/oauth/access_token"),
  META_WEBHOOK_VERIFY_TOKEN: z.string().optional().default(""),
  // karan: comma-separated allowlist; upgrade path is a User.role column.
  ADMIN_EMAILS: z
    .string()
    .optional()
    .default("")
    .transform((value) => {
      const emails = value
        .split(",")
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean);
      if (!emails.includes("dev@karandigitallabs.com")) {
        emails.push("dev@karandigitallabs.com");
      }
      return emails;
    }),
  INSTAGRAM_MOCK_MODE: z
    .string()
    .optional()
    .default("false")
    .transform((value) => value === "true"),
  RAZORPAY_KEY_ID: z.string().optional().default(""),
  RAZORPAY_KEY_SECRET: z.string().optional().default(""),
  NEXT_PUBLIC_RAZORPAY_KEY_ID: z.string().optional().default(""),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional().default(""),
  /** Bearer secret for /api/cron/* (VPS systemd timer / curl). */
  CRON_SECRET: z.string().optional().default(""),
  GOOGLE_CLIENT_ID: z.string().optional().default(""),
  GOOGLE_CLIENT_SECRET: z.string().optional().default(""),
  MARKETING_URL: z
    .string()
    .url()
    .optional()
    .default("https://kraftsandkodes.com"),
  SMTP_HOST: z.string().optional().default(""),
  SMTP_PORT: z.preprocess(
    (value) => (value === "" || value == null ? 587 : value),
    z.coerce.number().int().positive(),
  ),
  SMTP_USER: z.string().optional().default(""),
  SMTP_PASS: z.string().optional().default(""),
  MAIL_FROM: z.string().optional().default(""),
});

export type AppEnv = z.infer<typeof envSchema>;

function readEnv(): AppEnv {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid environment configuration: ${details}`);
  }
  return parsed.data;
}

let cached: AppEnv | undefined;

export function getEnv(): AppEnv {
  if (process.env.NODE_ENV === "test") {
    return readEnv();
  }
  cached ??= readEnv();
  return cached;
}

export function isProduction(): boolean {
  return getEnv().NODE_ENV === "production";
}

export function isMockMode(): boolean {
  const env = getEnv();
  return env.INSTAGRAM_MOCK_MODE && env.NODE_ENV !== "production";
}
