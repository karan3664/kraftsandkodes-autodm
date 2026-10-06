# Production PostgreSQL backup (Hostinger VPS)

Target: Docker Compose stack at `/opt/autodm` using `docker-compose.hostinger.yml`.

Do **not** put database passwords, connection strings, or `.env` contents in this document or in git.

## What to back up

- Postgres volume data via `pg_dump` (logical backup)
- Keep `/opt/autodm/.env` offline (password manager / encrypted store) — never commit it

## Nightly dump (recommended)

On the VPS, as root, create a backup directory owned by root:

```bash
mkdir -p /var/backups/autodm
chmod 700 /var/backups/autodm
```

Create `/usr/local/sbin/autodm-pg-dump.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail
STAMP=$(date -u +%Y%m%dT%H%M%SZ)
OUT="/var/backups/autodm/autodm-${STAMP}.sql.gz"
cd /opt/autodm
# Password comes from the compose env for the running postgres container — do not hardcode here.
docker compose -f docker-compose.hostinger.yml exec -T postgres \
  pg_dump -U autodm -d autodm --no-owner --no-privileges \
  | gzip -9 > "$OUT"
find /var/backups/autodm -name 'autodm-*.sql.gz' -mtime +14 -delete
echo "wrote $OUT"
```

```bash
chmod 700 /usr/local/sbin/autodm-pg-dump.sh
```

Systemd timer example:

`/etc/systemd/system/autodm-pg-dump.service`

```ini
[Unit]
Description=AutoDM Postgres dump

[Service]
Type=oneshot
ExecStart=/usr/local/sbin/autodm-pg-dump.sh
```

`/etc/systemd/system/autodm-pg-dump.timer`

```ini
[Unit]
Description=Nightly AutoDM Postgres dump

[Timer]
OnCalendar=*-*-* 02:15:00
Persistent=true

[Install]
WantedBy=timers.target
```

```bash
systemctl daemon-reload
systemctl enable --now autodm-pg-dump.timer
```

## Off-server copy

Copy `/var/backups/autodm/*.sql.gz` to encrypted off-VPS storage (S3, Backblaze, another host). Prefer encryption at rest on the remote side. Do not email dumps.

## Retention

- Local VPS: 14 days (script above)
- Off-server: 30–90 days depending on risk tolerance

## Restore (destructive — confirm first)

1. Stop the web container so it is not writing.
2. Restore into a **new** database or after intentional wipe of the target DB.
3. Example restore into the running postgres service:

```bash
gunzip -c /var/backups/autodm/autodm-YYYYMMDDTHHMMSSZ.sql.gz \
  | docker compose -f docker-compose.hostinger.yml exec -T postgres \
    psql -U autodm -d autodm
```

4. Restart web. Verify `/api/health` and login.

Never restore a dump over production without a written plan and a fresh dump taken immediately before the restore.
