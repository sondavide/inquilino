#!/bin/bash
# Initialises Let's Encrypt certificates for inquilinofacile.it.
# Run ONCE on a fresh VPS before starting the full stack.
#
# Usage (from deployment/production/):
#   bash scripts/init-letsencrypt.sh

set -e

DOMAIN="inquilinofacile.it"
EMAIL="privacy@inquilinofacile.it"
CERT_LIVE="./data/certbot/conf/live/$DOMAIN"
WEBROOT="./data/certbot/www"

# ── 0. Stop any running stack ──────────────────────────────────────────────────
echo "→ Stopping any running containers..."
docker compose down 2>/dev/null || true

# ── 1. Wipe any previous certbot state to avoid the -0001 suffix bug ──────────
# Certbot appends -0001 if the live/ directory existed before (even empty).
rm -rf ./data/certbot/conf/live \
       ./data/certbot/conf/archive \
       ./data/certbot/conf/renewal

mkdir -p "$CERT_LIVE" "$WEBROOT"

# ── 2. Create temporary self-signed certificate so nginx can start ─────────────
echo "→ Creating temporary self-signed certificate..."
docker run --rm \
  -v "$(pwd)/data/certbot/conf:/etc/letsencrypt" \
  --entrypoint openssl \
  certbot/certbot \
  req -x509 -nodes -newkey rsa:2048 -days 1 \
  -keyout "/etc/letsencrypt/live/$DOMAIN/privkey.pem" \
  -out    "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" \
  -subj   "/CN=localhost" 2>/dev/null
echo "  ✓ Temporary certificate created."

# ── 3. Start nginx only (uses temporary cert) ──────────────────────────────────
echo "→ Starting nginx with temporary certificate..."
docker compose up -d nginx
echo "  Waiting 8s for nginx to be ready..."
sleep 8

if ! docker compose ps nginx | grep -q "Up"; then
  echo "✗ ERROR: nginx failed to start. Logs:"
  docker compose logs nginx
  exit 1
fi
echo "  ✓ nginx is up."

# ── 4. Delete dummy cert so certbot can create its own directory structure ─────
# Nginx keeps the cert in memory — stays running fine during this brief gap.
# We also remove live/ entirely so certbot uses "inquilinofacile.it" (not "…-0001").
echo "→ Removing temporary certificate (nginx keeps it in memory)..."
rm -rf ./data/certbot/conf/live

# ── 5. Request real certificate from Let's Encrypt ────────────────────────────
echo "→ Requesting Let's Encrypt certificate for $DOMAIN and www.$DOMAIN ..."
echo "  (port 80 must be reachable from the internet)"
docker compose run --rm certbot certonly \
  --webroot -w /var/www/certbot \
  --email "$EMAIL" \
  -d "$DOMAIN" -d "www.$DOMAIN" \
  --agree-tos --no-eff-email

# ── 6. Reload nginx with real certificate ─────────────────────────────────────
echo "→ Reloading nginx with real Let's Encrypt certificate..."
docker compose exec nginx nginx -s reload
sleep 2

echo ""
echo "✓ SSL certificate issued for $DOMAIN."
echo "  Now start the full stack:"
echo ""
echo "    docker compose up -d"
echo ""
