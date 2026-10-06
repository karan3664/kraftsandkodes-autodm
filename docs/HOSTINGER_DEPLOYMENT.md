# Hostinger VPS deployment

Target: Ubuntu 24.04 VPS, Docker Compose, Nginx, Let’s Encrypt.

Locked hostnames:

- `kraftsandkodes.com` (landing)
- `www.kraftsandkodes.com`
- `app.kraftsandkodes.com` (SaaS)

DNS is **Cloudflare**, not Hostinger. See `docs/PRODUCTION.md`.

Do not deploy this product on Vercel or Supabase.

## Server bootstrap

```bash
sudo apt update && sudo apt install -y ca-certificates curl git
# Install Docker Engine + Compose plugin from Docker’s official Ubuntu instructions
sudo ufw allow OpenSSH
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

## Clone and configure

```bash
git clone <this-repo> /opt/autodm
cd /opt/autodm
cp .env.example .env
```

Production `.env` must include:

- `APP_URL=https://app.kraftsandkodes.com`
- `MARKETING_URL=https://kraftsandkodes.com`
- `META_REDIRECT_URI=https://app.kraftsandkodes.com/api/instagram/callback`
- `INSTAGRAM_MOCK_MODE=false`
- Razorpay keys + `RAZORPAY_WEBHOOK_SECRET`
- SMTP for receipts

## This VPS already runs Caddy

`187.127.145.181` serves KhatriSetu on :80/:443 via Caddy. Do **not** bind AutoDM nginx to those ports.

Use `docker-compose.hostinger.yml` (web on `127.0.0.1:3010`) and append `deploy/hostinger/Caddyfile.snippet` to `/etc/caddy/Caddyfile`.

```bash
cd /opt/autodm
docker compose -f docker-compose.hostinger.yml up -d --build
# migrate from a one-off node container on the compose network (see deploy log)
sudo cp /etc/caddy/Caddyfile /etc/caddy/Caddyfile.bak.autodm
sudo tee -a /etc/caddy/Caddyfile < deploy/hostinger/Caddyfile.snippet
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

Cloudflare SSL: **Full** (Caddy issues origin certs). Switch to **Full (strict)** after HTTPS works.

## Health

```
https://app.kraftsandkodes.com/api/health
https://kraftsandkodes.com/
```

## Backups

Back up Docker volume `autodm_pg_data` and keep `.env` out of git.
