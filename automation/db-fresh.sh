#!/usr/bin/env bash
# Drops and recreates the database from scratch, then seeds it with the base
# "company philosophy" scaffold ONLY — NFRS chart of accounts, permission
# modules + menu tree, an Administrator role, one admin login. No demo
# transactions (use automation/seed-demo.sh for those).
#
# This is what a fresh production deployment should run for a brand-new
# client: pass real company details as SEED_* env vars (see below) so the
# database is seeded with THAT company's identity, not the "Bela Nepal
# (Demo)" placeholder. Run with no env vars for local dev — the same
# demo-shaped defaults this project has always used.
#
# Usage:
#   automation/db-fresh.sh                    # interactive: confirms, offers to fill in company details
#   automation/db-fresh.sh --yes              # non-interactive: skips the confirmation prompt
#   automation/db-fresh.sh --yes --real-company   # non-interactive AND requires SEED_COMPANY_NAME etc. to be set
#
# Env vars forwarded straight to prisma/seed.ts (all optional, all default
# to the existing demo identity — see prisma/seed.ts's `cfg` object):
#   SEED_COMPANY_SUBDOMAIN  SEED_COMPANY_NAME     SEED_COMPANY_ADDRESS
#   SEED_LEGAL_NAME         SEED_DISPLAY_NAME     SEED_COMPANY_PHONE
#   SEED_COMPANY_EMAIL      SEED_COMPANY_WEBSITE  SEED_COMPANY_PAN
#   SEED_REGISTERED_ADDRESS SEED_ADMIN_EMAIL      SEED_ADMIN_PASSWORD
#   SEED_ADMIN_FIRST_NAME   SEED_ADMIN_LAST_NAME  SEED_ADMIN_PHONE
#   SEED_SKIP_DEMO_USERS=1  (drop the second "cashier@bela.local" demo login)
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"
# shellcheck source=lib/common.sh
source lib/common.sh

require_cmd npm "Install Node.js 20+ first."
require_cmd npx "Ships with npm — reinstall Node.js if missing."

AUTO_YES=0
REAL_COMPANY=0
for arg in "$@"; do
  case "$arg" in
    --yes|-y) AUTO_YES=1 ;;
    --real-company) REAL_COMPANY=1 ;;
    *) fail "Unknown argument: $arg (expected --yes and/or --real-company)" ;;
  esac
done

# ── .env bootstrap ──────────────────────────────────────────────────────
if [ ! -f "$APP_DIR/.env" ]; then
  warn "$APP_DIR/.env is missing."
  if [ "$AUTO_YES" = "1" ]; then
    fail "Refusing to invent database credentials non-interactively. Create $APP_DIR/.env first (copy .env.example and fill in DATABASE_URL)."
  fi
  confirm "Create app/.env from app/.env.example now, generating random auth secrets?" || fail "Aborted."
  cp "$APP_DIR/.env.example" "$APP_DIR/.env"
  for var in JWT_ACCESS_SECRET JWT_REFRESH_SECRET APP_SECRET; do
    secret="$(node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))")"
    # Portable in-place sed edit (works on both GNU and BSD/macOS sed).
    sed -i.bak "s#^${var}=.*#${var}=\"${secret}\"#" "$APP_DIR/.env" && rm -f "$APP_DIR/.env.bak"
  done
  ok "Created app/.env with fresh random secrets. Edit DATABASE_URL if it isn't a local default Postgres."
fi
load_app_env

# ── real-company guardrail ──────────────────────────────────────────────
if [ "$REAL_COMPANY" = "1" ] && [ -z "${SEED_COMPANY_NAME:-}" ]; then
  fail "--real-company requires SEED_COMPANY_NAME (and normally SEED_ADMIN_EMAIL/SEED_ADMIN_PASSWORD) to be exported first — refusing to seed a real deployment with the demo identity."
fi

# ── confirm ──────────────────────────────────────────────────────────────
warn "This PERMANENTLY drops and recreates the database at:"
warn "  ${DATABASE_URL:-<DATABASE_URL not set — check app/.env>}"
if [ "$AUTO_YES" != "1" ]; then
  confirm "Continue?" || fail "Aborted — no changes made."
fi

cd "$APP_DIR"
if [ ! -d node_modules ]; then
  log "node_modules missing — installing dependencies first (npm install) ..."
  npm install
fi

log "Resetting database (prisma migrate reset --force) — this also runs prisma/seed.ts ..."
npx prisma migrate reset --force --skip-generate
npx prisma generate

ok "Fresh database ready."
if [ -n "${SEED_COMPANY_NAME:-}" ]; then
  ok "Seeded company: ${SEED_COMPANY_NAME}"
else
  ok "Seeded the demo company (Bela Nepal (Demo)) — pass SEED_COMPANY_NAME etc. for a real deployment."
fi
log "Next: automation/run-dev.sh (or run-prod.sh), then optionally automation/seed-demo.sh for a full two-fiscal-year demo dataset."
