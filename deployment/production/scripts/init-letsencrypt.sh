#!/bin/bash
# Initialises Let's Encrypt certificates for inquilinofacile.it.
# Run once on a fresh VPS, before starting the full stack.
#
# Usage: bash scripts/init-letsencrypt.sh

set -e

DOMAIN="inquilinofacile.it"
EMAIL="privacy@inquilinofacile.it"
CERT_PATH="./data/certbot/conf"
WEBROOT_PATH="./data/certbot/www"

# ── 1. Create directories ──────────────────────────────────────────────────────
mkdir -p "$CERT_PATH" "$WEBROOT_PATH"

# ── 2. Download recommended TLS parameters (if not already present) ────────────
if [ ! -f "$CERT_PATH/options-ssl-nginx.conf" ]; then
  echo "→ Downloading recommended TLS parameters..."
  curl -fsSL \
    "https://raw.githubusercontent.com/certbot/certbot/master/certbot-nginx/certbot_nginx/_internal/tls_configs/options-ssl-nginx.conf" \
    -o "$CERT_PATH/options-ssl-nginx.conf"
fi

if [ ! -f "$CERT_PATH/ssl-dhparams.pem" ]; then
  echo "→ Downloading DH parameters..."
  curl -fsSL \
    "https://raw.githubusercontent.com/certbot/certbot/master/certbot/certbot/ssl-dhparams.pem" \
    -o "$CERT_PATH/ssl-dhparams.pem"
fi

# ── 3. Create a temporary self-signed cert so nginx can start ──────────────────
if [ ! -d "$CERT_PATH/live/$DOMAIN" ]; then
  echo "→ Creating temporary self-signed certificate..."
  mkdir -p "$CERT_PATH/live/$DOMAIN"
  docker run --rm \
    -v "$(pwd)/$CERT_PATH:/etc/letsencrypt" \
    --entrypoint openssl \
    certbot/certbot \
    req -x509 -nodes -newkey rsa:4096 -days 1 \
    -keyout "/etc/letsencrypt/live/$DOMAIN/privkey.pem" \
    -out    "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" \
    -subj "/CN=localhost" 2>/dev/null
fi

# ── 4. Start nginx with the dummy cert ────────────────────────────────────────
echo "→ Starting nginx..."
docker compose up -d nginx
sleep 3

# ── 5. Request the real certificate via webroot ───────────────────────────────
echo "→ Requesting Let's Encrypt certificate for $DOMAIN ..."
docker compose run --rm certbot certonly \
  --webroot -w /var/www/certbot \
  -d "$DOMAIN" -d "www.$DOMAIN" \
  --email "$EMAIL" \
  --agree-tos --no-eff-email \
  --force-renewal

# ── 6. Reload nginx to load the real cert ─────────────────────────────────────
echo "→ Reloading nginx..."
docker compose exec nginx nginx -s reload

echo ""
echo "✓ Certificate issued successfully for $DOMAIN."
echo "  You can now start the full stack: docker compose up -d"
