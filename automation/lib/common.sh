#!/usr/bin/env bash
# Shared helpers sourced by every script in automation/. Keep this POSIX-ish
# bash (no bashisms beyond arrays) so it also runs under the Git Bash shell
# used on the maintainers' Windows dev machines, not just a Linux VPS.

set -euo pipefail

# ── paths ─────────────────────────────────────────────────────────────────
# AUTOMATION_DIR / REPO_ROOT / APP_DIR are always available to any script
# that sources this file, regardless of the caller's own working directory.
COMMON_SH_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AUTOMATION_DIR="$(cd "$COMMON_SH_DIR/.." && pwd)"
REPO_ROOT="$(cd "$AUTOMATION_DIR/.." && pwd)"
APP_DIR="$REPO_ROOT/app"

# ── colored logging ──────────────────────────────────────────────────────
if [ -t 1 ]; then
  C_RESET=$'\033[0m'; C_BLUE=$'\033[1;34m'; C_GREEN=$'\033[1;32m'
  C_YELLOW=$'\033[1;33m'; C_RED=$'\033[1;31m'
else
  C_RESET=""; C_BLUE=""; C_GREEN=""; C_YELLOW=""; C_RED=""
fi
log()  { printf '%s[automation]%s %s\n' "$C_BLUE" "$C_RESET" "$*"; }
ok()   { printf '%s[  ok   ]%s %s\n' "$C_GREEN" "$C_RESET" "$*"; }
warn() { printf '%s[ warn  ]%s %s\n' "$C_YELLOW" "$C_RESET" "$*"; }
fail() { printf '%s[ error ]%s %s\n' "$C_RED" "$C_RESET" "$*" >&2; exit 1; }

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "'$1' is required but not installed. $2"
}

# ── env loading ───────────────────────────────────────────────────────────
# Loads app/.env into the current shell if present, without clobbering
# anything the caller already exported (e.g. CI secrets).
load_app_env() {
  local env_file="$APP_DIR/.env"
  if [ -f "$env_file" ]; then
    set -a
    # shellcheck disable=SC1090
    source "$env_file"
    set +a
  fi
}

confirm() {
  # confirm "Prompt text" — returns 0 (proceed) only on an explicit y/yes.
  # Always refuses in a non-interactive shell (CI, piped input) rather than
  # silently assuming consent for a destructive action.
  local prompt="$1"
  if [ ! -t 0 ]; then
    fail "'$prompt' needs an interactive terminal to confirm — refusing to assume yes non-interactively. Pass --yes to skip this check."
  fi
  read -r -p "$prompt [y/N] " reply
  case "$reply" in
    [yY]|[yY][eE][sS]) return 0 ;;
    *) return 1 ;;
  esac
}
