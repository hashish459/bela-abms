#!/usr/bin/env bash
# Builds and runs a production-style server in the foreground (no hot reload).
# This is the exact command the VPS systemd service (see deploy-vps.sh) runs;
# use it locally first to sanity-check a build before pushing it to a server.
#
# Env vars:
#   PORT        — defaults to 3000
#   SKIP_BUILD  — set to "1" to skip `npm run build` and just start (useful
#                 when deploy-vps.sh already built and you're only restarting)
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"
# shellcheck source=lib/common.sh
source lib/common.sh

require_cmd npm "Install Node.js 20+ first."

if [ ! -f "$APP_DIR/.env" ]; then
  fail "$APP_DIR/.env is missing. Copy app/.env.example to app/.env and fill in production secrets first."
fi

cd "$APP_DIR"
if [ ! -d node_modules ]; then
  log "node_modules missing — installing production dependencies (npm ci) ..."
  npm ci
fi

if [ "${SKIP_BUILD:-0}" != "1" ]; then
  log "Building (npm run build) ..."
  npm run build
else
  log "SKIP_BUILD=1 — reusing the existing .next build."
fi

PORT="${PORT:-3000}"
log "Starting production server on port $PORT ..."
exec npm run start -- -p "$PORT"
