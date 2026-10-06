# Production rollback (AutoDM on Hostinger)

Stack: Docker Compose (`docker-compose.hostinger.yml`) on the VPS at `/opt/autodm`. Image name: `autodm-web:latest` (built locally on the VPS).

## Tag a known-good release

On the deploy machine / VPS after a healthy deploy:

```bash
cd /opt/autodm
docker tag autodm-web:latest autodm-web:good-$(date -u +%Y%m%d)
# optional: also tag with git SHA if the tree is a git checkout
# docker tag autodm-web:latest autodm-web:git-<sha>
docker images | grep autodm-web
```

Record the tag name in your runbook (chat, Notion, etc.).

## Rollback application without resetting the database

1. Identify the last good tag (`autodm-web:good-YYYYMMDD`).
2. Retag it as `latest` and recreate **only** the web service:

```bash
cd /opt/autodm
docker tag autodm-web:good-YYYYMMDD autodm-web:latest
docker compose -f docker-compose.hostinger.yml --env-file .env up -d --no-deps --force-recreate web
```

3. Confirm:

```bash
curl -sS http://127.0.0.1:3010/api/health
```

Postgres and Redis volumes are left untouched.

## If you must rebuild from source at an older commit

Only if the VPS directory is a git checkout:

```bash
cd /opt/autodm
git fetch --all
git checkout <known-good-sha>
docker compose -f docker-compose.hostinger.yml --env-file .env up -d --build web
```

Do **not** delete volumes. Do **not** overwrite `.env`.

## Migration safety rules

- Prefer additive migrations (new columns/enums/tables).
- Never run `prisma migrate reset` or drop volumes in production.
- Before a migration that cannot be reversed easily: take a `pg_dump` (see `docs/production-backup.md`).
- If a new app version requires a migration, run migrate **before** or as part of the deploy that needs it; rolling back the app image alone may fail if the schema already moved forward — in that case restore DB from dump only with an explicit plan.
- Enum additions (e.g. `PaymentStatus.refunded`) are forward-compatible; old app images that ignore the new value are usually safe.

## Instagram token refresh cron (related)

After deploy, ensure a daily timer hits the cron route (secret from `.env`, never commit):

```bash
curl -sS -X POST \
  -H "Authorization: Bearer $CRON_SECRET" \
  https://app.kraftsandkodes.com/api/cron/refresh-instagram-tokens
```

Systemd oneshot + daily timer is enough; do not refresh tokens on every HTTP request.
