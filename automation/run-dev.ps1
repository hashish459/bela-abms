#Requires -Version 5.1
<#
.SYNOPSIS
    Starts the Bela ABMS app in development mode (hot reload).

.DESCRIPTION
    PowerShell equivalent of automation/run-dev.sh for Windows developers
    who don't have Git Bash / WSL available.

    Use automation/run-prod.ps1 for a production-style build+start.

.EXAMPLE
    .\automation\run-dev.ps1
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# ── helpers ───────────────────────────────────────────────────────────────────
function Write-Log  { param([string]$Msg) Write-Host "[automation] $Msg" -ForegroundColor Cyan }
function Write-Ok   { param([string]$Msg) Write-Host "[  ok   ] $Msg"    -ForegroundColor Green }
function Write-Warn { param([string]$Msg) Write-Host "[ warn  ] $Msg"    -ForegroundColor Yellow }
function Write-Fail { param([string]$Msg) Write-Host "[ error ] $Msg" -ForegroundColor Red; exit 1 }

function Require-Command {
    param([string]$Cmd, [string]$Hint)
    if (-not (Get-Command $Cmd -ErrorAction SilentlyContinue)) {
        Write-Fail "'$Cmd' is required but not found. $Hint"
    }
}

# ── paths ─────────────────────────────────────────────────────────────────────
$AutomationDir = $PSScriptRoot
$RepoRoot      = Split-Path $AutomationDir -Parent
$AppDir        = Join-Path $RepoRoot 'app'

# ── pre-flight checks ─────────────────────────────────────────────────────────
Require-Command 'npm' 'Install Node.js 20+ from https://nodejs.org first.'

$EnvFile = Join-Path $AppDir '.env'
if (-not (Test-Path $EnvFile)) {
    Write-Fail "$EnvFile is missing.`nCopy app\.env.example to app\.env and fill in DATABASE_URL/secrets first."
}

# ── install deps if needed ────────────────────────────────────────────────────
$NodeModules = Join-Path $AppDir 'node_modules'
if (-not (Test-Path $NodeModules)) {
    Write-Log 'node_modules missing — installing dependencies first (npm install) ...'
    Push-Location $AppDir
    try   { npm install }
    finally { Pop-Location }
}

# ── start dev server ──────────────────────────────────────────────────────────
Write-Log 'Starting dev server (npm run dev) — Ctrl+C to stop.'
Set-Location $AppDir
npm run dev
