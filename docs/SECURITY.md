# Security

## Authentication

- Email/password only in this MVP
- Passwords hashed with bcrypt (cost 12)
- Session token is a random secret; only the SHA-256 hash is stored
- Cookie: HttpOnly, SameSite=Lax, Path=/, Secure in production

## CSRF

Mutating API routes reject a mismatched `Origin` header when one is present. Same-site form navigation from the app origin is accepted.

## Secrets

Never commit `.env`. Placeholders live in `.env.example`.

Never log or return:

- Instagram access tokens
- `META_APP_SECRET`
- Passwords
- Authorization codes
- Session tokens

Instagram tokens are encrypted with AES-256-GCM via `encryptSecret()` / `decryptSecret()` using `TOKEN_ENCRYPTION_KEY`.

## Authorization

Every automation and Instagram mutation loads the record with `userId` (see `getOwnedAutomation` / `getOwnedInstagramAccount`).

## Webhooks

- GET challenge uses `META_WEBHOOK_VERIFY_TOKEN`
- POST verifies `X-Hub-Signature-256`
- Duplicate `eventId` and duplicate `(instagramAccountId, instagramCommentId)` are ignored

## Rate limits

Auth endpoints are rate-limited (Redis when available, in-memory fallback).

## XSS / SQL

- React renders text safely
- Prisma parameterized queries

## Developer simulation

`POST /api/dev/simulate-comment` is disabled when `NODE_ENV=production`.
