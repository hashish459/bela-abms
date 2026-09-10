# PROGRESS — session log & roadmap

> **Read this first.** It is the hand-off document between working sessions.
> Update it at the end of every session.

## Current status: `PHASE 1 — DISCOVERY (in progress)`

Development order (from the brief): INSPECT → ARCHITECTURE → FOUNDATION → CORE UI →
MODULES → CROSS-MODULE WORKFLOWS → ENTERPRISE HARDENING → QA.

---

## Session log

### Session 1 — 2026-09-10
- Read the client brief (`Docs/InitialPrompt_clonning.docx`).
- Decisions locked with client:
  - Stack: **Next.js (App Router, TS) + Prisma + PostgreSQL**, Tailwind, session auth.
  - Session-1 deliverable: discovery + architecture docs + scaffold + auth/RBAC/navigation slice.
  - Reference-app inspection: client logs in, Claude drives the browser (Claude may not type passwords).
- Reference app: `https://bela.nepalebilling.com`
  - Root domain serves the **marketing site** (Home / Features / Industries / Blog / API Docs / Pricing / Contact / FAQ).
  - `/login`, `/signup`, `/reset-password` are the auth routes.
  - Product = "Nepal E-Billing System": IRD-certified VAT billing + NFRS-based reporting,
    invoicing & billing, fixed assets & inventory, real-time financial data & analysis,
    NFRS reports (daily report, yearly analysis, P&L, cash flow).
- Scaffolded `app/` with `create-next-app` (Next.js 16.3.4, React 19, Tailwind 4, TS, App Router, src-dir).
- **BLOCKER FOUND:** parent folder name contains `&` → breaks `npx`, `npm run`, Next.js build,
  Prisma CLI on Windows (cmd.exe treats `&` as a command separator; child processes get
  truncated path `D:\next\...`). Client agreed to **rename the folder**.
- Removed `app/node_modules` + `package-lock.json` for a clean reinstall after rename.

### ⏭️ RESUME HERE (next session)
1. Confirm folder was renamed (no `&`), e.g. `D:\Bela_Accounting_and_Business_Management_Sys`.
2. `cd app && npm install` (re-add deps).
3. Add: `prisma`, `@prisma/client`, `argon2`, `zod`, `@t3-oss/env-nextjs`, `pino`,
   dev: `vitest`, `@playwright/test`, `tsx`.
4. Build Phase 3 foundation: Prisma platform schema (User, Role, Permission, UserRole,
   RolePermission, Session, Menu, AuditLog, LoginAttempt) → migration → seed →
   session auth (login/logout/me) → `requirePermission` → `/api/menu` → sidebar shell.
5. Then get client to log in to reference app for real discovery → fill `INVENTORY.md`.

- **Still pending:** authenticated inspection of the reference app (client login required).

---

## Roadmap / checklist

### Phase 1 — Discovery
- [ ] Log in to reference app
- [ ] Capture app shell (header, sidebar, footer, breadcrumbs)
- [ ] Full navigation tree (menu → submenu → page), with routes + icons
- [ ] Per-module: pages, tables (columns/filters/sort/pagination), forms (fields/validation), actions
- [ ] Dashboard: cards / KPIs / charts and how each is calculated
- [ ] Billing/invoice workflow + exact calculation rules (subtotal, discount, tax, total, balance)
- [ ] Inventory/stock-movement logic
- [ ] Reports / print / export inventory
- [ ] Roles & permissions visible to this account
- [ ] Settings / configuration / user-management sections
- [ ] Record everything in `INVENTORY.md` + `DISCOVERY-LOG.md`

### Phase 2 — Architecture
- [ ] `ARCHITECTURE.md`, `DATABASE.md` (ER model), `ROUTES.md`, `WORKFLOWS.md`, authorization model

### Phase 3 — Foundation
- [ ] Next.js project scaffold in `app/`
- [ ] Prisma schema + first migration (users, roles, permissions, menu, audit_log)
- [ ] Session auth (login / logout / session / protected routes / middleware)
- [ ] RBAC: user → role → permission → module → action; server-side checks
- [ ] Data-driven navigation (menu table → API → sidebar), permission-filtered
- [ ] Error handling, logging, config, consistent API response envelope

### Phase 4+ — Core UI & Modules
- [ ] Layout / design system matched to reference
- [ ] Modules one by one: UI → API → DB → validation → authz → tests

---

## Open questions for the client
- Which roles/users exist? Can we see a second (lower-privilege) role to map permission differences?
- Is multi-branch / multi-organization (tenant) in scope for this account?
- Target deployment environment (for `DEPLOYMENT.md` later)?
