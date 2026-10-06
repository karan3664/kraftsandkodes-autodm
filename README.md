# KRAFTSANDKODES AutoDM

Instagram comment-to-DM automation for creators and businesses.

**Product:** KRAFTSANDKODES AutoDM  
**Company:** Karan Digital Labs  
**Website:** `https://kraftsandkodes.com`  
**App:** `https://app.kraftsandkodes.com`

A commenter writes a keyword such as `TRAIN` on an Instagram post or reel. Meta sends a webhook. AutoDM matches an enabled automation and sends **one** eligible private reply through the official Instagram API.

This is not a matrimonial product. It does not scrape Instagram, send bulk DMs, or use unofficial clients.

## Architecture

```
Instagram professional account
        → Instagram Login (OAuth)
        → Encrypted token stored in PostgreSQL
        → User creates keyword automation
        → Comment on post/reel
        → Meta webhook POST /api/webhooks/instagram
        → Idempotent event + keyword match
        → POST /{IG_USER_ID}/messages (private reply)
        → Activity recorded in dashboard
```

The Next.js app owns HTTP. Webhook processing lives in `apps/web/src/lib/automation/engine.ts` so it can move to a worker later.

```
User → Nginx → Next.js (apps/web)
                 ├─ Prisma → PostgreSQL
                 ├─ Redis (idempotency, rate limits, future queues)
                 └─ packages/instagram → graph.instagram.com
```

## Tech stack

- Next.js 15 (App Router), React, TypeScript, Tailwind CSS, shadcn-style UI
- Prisma + PostgreSQL
- Redis
- Vitest
- Docker Compose, Nginx, Hostinger VPS (no Vercel, no Supabase)

## Folder structure

```
apps/web/                 Next.js app (UI, route handlers)
packages/db/              Prisma schema, client, seed
packages/shared/          Zod schemas, API types, keyword matching, crypto
packages/instagram/       InstagramClient (Graph + mock)
nginx/                    Reverse proxy for kraftsandkodes.com and app.kraftsandkodes.com
docs/                     Meta, webhook, deploy, review, security
```

## Prisma schema

- `User` — email/password SaaS account
- `Session` — hashed session tokens
- `InstagramAccount` — professional account + encrypted access token
- `InstagramMedia` — a synced post or reel
- `Automation` — scoped to one media item, with an action type (`private_reply` today)
- `AutomationKeyword` — one or more trigger keywords for that media
- `AutomationExecution` — unique per account + comment ID
- `WebhookEvent` — unique `eventId` for idempotency

## Environment variables

Copy `.env.example` to `.env` at the repository root. Never commit real values.

| Variable                          | Purpose                                     |
| --------------------------------- | ------------------------------------------- |
| `DATABASE_URL`                    | PostgreSQL connection string                |
| `REDIS_URL`                       | Redis connection string                     |
| `APP_URL`                         | Public origin, e.g. `http://localhost:3000` |
| `SESSION_SECRET`                  | Cookie signing / session hardening          |
| `TOKEN_ENCRYPTION_KEY`            | AES-256-GCM key for Instagram tokens        |
| `META_APP_ID` / `META_APP_SECRET` | Meta app credentials                        |
| `META_REDIRECT_URI`               | OAuth callback (`/api/instagram/callback`)  |
| `META_API_VERSION`                | Graph API version, default `v23.0`          |
| `META_GRAPH_BASE_URL`             | Default `https://graph.instagram.com`       |
| `META_WEBHOOK_VERIFY_TOKEN`       | Webhook GET challenge token                 |
| `INSTAGRAM_MOCK_MODE`             | `true` only for local development           |

## Local setup

```bash
cp .env.example .env
pnpm install
pnpm db:generate
```

Start PostgreSQL and Redis (Docker is recommended):

```bash
docker compose up -d postgres redis
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Open `http://localhost:3000`.

Seeded local user (development only):

- Email: `dev@karandigitallabs.com`
- Password: `DevPassword123!`

The seed stores a **mock** Instagram token, never a real credential.

If Docker is unavailable, point `DATABASE_URL` and `REDIS_URL` at any local Postgres 16 and Redis 7 instances.

## Commands

```bash
pnpm dev
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm db:migrate
pnpm db:seed
pnpm db:studio
```

## Meta OAuth / webhook

Instagram Login (Business Login for Instagram), host `graph.instagram.com`.

Requested scopes:

- `instagram_business_basic`
- `instagram_business_manage_comments`
- `instagram_business_manage_messages`

Private reply (official):

```
POST https://graph.instagram.com/{API_VERSION}/{IG_USER_ID}/messages
Authorization: Bearer {INSTAGRAM_USER_ACCESS_TOKEN}
{
  "recipient": { "comment_id": "{COMMENT_ID}" },
  "message": { "text": "{REPLY}" }
}
```

Webhook subscribe after connect:

```
POST /{API_VERSION}/me/subscribed_apps?subscribed_fields=comments
```

See [docs/META_SETUP.md](docs/META_SETUP.md) and [docs/WEBHOOK_SETUP.md](docs/WEBHOOK_SETUP.md).

## Mock mode

Set `INSTAGRAM_MOCK_MODE=true` and `NODE_ENV=development`.

- Connect Instagram uses a mock OAuth callback
- Private replies are not sent to Meta
- Simulate a comment:

```bash
curl -X POST http://localhost:3000/api/dev/simulate-comment \
  -H "Content-Type: application/json" \
  -b "autodm_session=..." \
  -d '{"instagramAccountId":"...","instagramMediaId":"media_train_reel","commentId":"test-comment-001","username":"test_user","text":"TRAIN"}'
```

This endpoint is rejected when `NODE_ENV=production`.

## Production / Hostinger

See [docs/HOSTINGER_DEPLOYMENT.md](docs/HOSTINGER_DEPLOYMENT.md).

```bash
docker compose -f docker-compose.production.yml up -d --build
```

Nginx terminates TLS for `kraftsandkodes.com` and `app.kraftsandkodes.com` and proxies to the `web` container.

## Security

- HttpOnly, SameSite=Lax cookies; Secure in production
- Passwords hashed with bcrypt
- Instagram tokens encrypted at rest
- Webhook signatures verified (`X-Hub-Signature-256`)
- Ownership checks on automations and Instagram accounts
- Structured logs never include tokens, secrets, passwords, or auth codes

Details: [docs/SECURITY.md](docs/SECURITY.md)

## Meta App Review

Reviewer flow and screencast notes: [docs/APP_REVIEW.md](docs/APP_REVIEW.md)

## Product rules

AutoDM sends a private reply only when:

1. An eligible Instagram comment event is received
2. An enabled automation matches
3. The connected account has valid authorization

It will not repeatedly DM users, scrape comments, or bypass Meta restrictions.
