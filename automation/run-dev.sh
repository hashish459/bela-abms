#!/usr/bin/env bash
# Starts the app in development mode (hot reload). Use automation/run-prod.sh
# for a production-style build+start, and automation/deploy-vps.sh for a real
# server behind Nginx/PM2.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"
# shellcheck source=lib/common.sh
source lib/common.sh

require_cmd npm "Install Node.js 20+ first."

if [ ! -f "$APP_DIR/.env" ]; then
  fail "$APP_DIR/.env is missing. Copy app/.env.example to app/.env and fill in DATABASE_URL/secrets first, or run automation/db-fresh.sh which will offer to do this for you."
fi

cd "$APP_DIR"
if [ ! -d node_modules ]; then
  log "node_modules missing — installing dependencies first (npm install) ..."
  npm install
fi

log "Starting dev server (npm run dev) — Ctrl+C to stop."
exec npm run dev
