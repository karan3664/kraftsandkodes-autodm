# Instagram long-lived token refresh

Long-lived Instagram User tokens expire (~60 days). The app refreshes them before expiry.

## Behavior

- Route: `POST` / `GET` `/api/cron/refresh-instagram-tokens`
- Auth: `Authorization: Bearer $CRON_SECRET` (or `?secret=` for simple curl)
- Selects accounts with `tokenExpiresAt` within the next 7 days
- Calls Meta `refresh_access_token`
- Re-encrypts the new token with `TOKEN_ENCRYPTION_KEY`
- Updates `tokenExpiresAt`
- Never logs access tokens
- Uses a Redis (or process-local) lock so the same account is not refreshed concurrently

## VPS schedule

Set `CRON_SECRET` in `/opt/autodm/.env`, recreate web, then add a daily systemd timer that curls the route (see `docs/production-rollback.md`).

Do not enable this endpoint without `CRON_SECRET` set — requests return 401.
