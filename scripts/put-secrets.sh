#!/usr/bin/env bash
# Uploads the server-side secrets to the Cloudflare Worker without ever printing them.
# Usage: bash scripts/put-secrets.sh [env-file]   (default: .env.local)
set -euo pipefail
FILE="${1:-.env.local}"
NAMES=(DATABASE_URL CLERK_SECRET_KEY CLERK_WEBHOOK_SIGNING_SECRET)
for name in "${NAMES[@]}"; do
  value="$(grep -E "^${name}=" "$FILE" | head -n1 | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//' || true)"
  if [ -z "$value" ]; then echo "skip  $name (not set in $FILE)"; continue; fi
  printf '%s' "$value" | npx wrangler secret put "$name" >/dev/null && echo "put   $name"
done
