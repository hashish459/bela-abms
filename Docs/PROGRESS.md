# PROGRESS — session log & roadmap

> **Read this first.** Hand-off document between working sessions. Update at end of every session.

## Current status: `PHASE 3 — FOUNDATION (done)` → next: PHASE 1 deep discovery + PHASE 5 modules

Order (from brief): INSPECT → ARCHITECTURE → FOUNDATION → CORE UI → MODULES →
CROSS-MODULE WORKFLOWS → ENTERPRISE HARDENING → QA.

Project now lives at **`D:\Bela_ABMS\`** (renamed from the `&`-containing path). App in `app/`.

---

## Session log

### Session 1 — 2026-09-10
- Read brief. Locked stack: **Next.js + Prisma + PostgreSQL**, session auth, Tailwind.
- Built `Docs/` living-doc set + Next.js scaffold. Hit `&`-in-path blocker → folder rename.

### Session 2 — 2026-09-10 (this session)
- **Authenticated discovery of the reference app** (client logged in, Claude drove). Captured:
  stack (Next.js Pages Router + **Django REST API** at `bela.api.nepalebilling.com`, **JWT**
  auth, multi-company/branch, Nepali FY), design tokens (`#00A8E8` accent, DM Sans, `#F0F0F0`),
  full 13-item nav tree, 15 permission groups / 76 modules, key module forms (Sales Invoice,
  Purchase Invoice, Product, Journal Voucher, COA, Budget, Token), Reports catalogue (35+),
  Settings (17 sub-pages), RBAC model. → `Docs/DISCOVERY-LOG.md` + `Docs/INVENTORY.md`.
- **Built Phase 3 foundation** in `app/` (Next.js 16.3.4 / React 19 / Tailwind 4 / Prisma 6):
  - Postgres DB `bela_abms` (local PG18). Prisma schema: 14 platform models. Migration
    `20260910173254_init_platform` applied.
  - **Seed** (`npm run db:seed`): 76 PermissionModules, full MenuItem tree, demo Company
    "Bela Nepal" + Head Office branch + FY 2083-84, `Administrator` (system, all perms) +
    `Cashier` (limited) roles, `admin@bela.local` / `cashier@bela.local` (pw `password123`).
  - **Auth:** `POST /api/auth/login|logout|refresh`, `GET /api/auth/me`. JWT access (15m) +
    rotating refresh (7d), both httpOnly+SameSite cookies. bcrypt(12). LoginAttempt throttle
    (8/15min). AuditLog on login/logout.
  - **RBAC:** `User→UserRole→Role→RolePermission→PermissionModule`; `getEffectivePermissions`,
    `can()`, `requirePermission()`. ADMIN userType = wildcard.
  - **Data-driven nav:** `GET /api/menu` returns permission-filtered tree via `lib/menu.ts`.
    Verified: admin sees 13 groups / all children; cashier sees Dashboard + Sales(3) +
    Inventory(1) + Accounts(1).
  - **Proxy** (`src/proxy.ts`, Next 16 renamed middleware) guards `/dashboard/*`.
  - **UI shell:** `(auth)/login` + `(app)/layout` with `components/app-shell.tsx` (sidebar,
    header w/ FY chip + bell + user menu, responsive). `(app)/dashboard` (honest — lists
    accessible module groups, no fake KPIs). `(app)/dashboard/[...slug]` catch-all = permission-
    gated "not implemented" stub for wired-but-unbuilt routes.
  - ✅ `tsc --noEmit`, `eslint src`, `next build` all pass.

### ⏭️ RESUME HERE (next session)
- **Option A — deeper discovery** (recommended before heavy module work): log into reference,
  capture per-form validation/modals/empty+error states, the Sales Invoice + Purchase Invoice
  calculation math (VAT rate, inclusive/exclusive, discount scope), invoice-number format,
  Contra/Stock-journal/Credit-note/Debit-note forms, each Report's filters+columns, Settings
  sub-pages (Tax, Custom fields, Printing templates), and a lower-privilege role's nav diff.
- **Option B — start modules** (Phase 5), in this order:
  1. **Settings core:** Company Info, Fiscal Year, Tax rates, Users & Roles UI (matrix editor),
     Custom fields, Banks. (Unblocks everything else.)
  2. **Accounts:** Chart of Accounts (seed NFRS COA ~190 accounts), Contacts (customer/supplier),
     Cash & Bank.
  3. **Inventory:** Product Category, Units, Warehouse, Product, opening stock.
  4. **Sales:** Quotation → Sales Order → Sales Invoice (+ server-side totals engine) → Receipt.
  5. **Purchase:** Purchase Order → Purchase Invoice → Payment.
  6. **Vouchers:** Journal / Contra / Stock Journal → GL.
  7. **Reports:** Trial Balance, P&L, Balance Sheet, Stock Summary, VAT Return, Aging.
  8. **CRM, Budget, Token, Documents, Store Builder.**
- Each module: Prisma models → migration → Zod validators → service (tx) → `/api/<domain>`
  routes (`requirePermission`) → UI page replacing the stub → Vitest + Playwright.

---

## Environment / how to run
```
cd D:\Bela_ABMS\app
# Postgres 18 local, DB "bela_abms", trust auth for user postgres (see .env)
npm install
npm run db:migrate      # apply migrations
npm run db:seed         # reference data + demo users
npm run dev             # http://localhost:3000  (login: admin@bela.local / password123)
npm run typecheck && npx eslint src && npm run build
```

## Open questions for the client
- VAT: fixed 13% or configurable per product/tax-type? Inclusive or exclusive pricing?
- Invoice number format & does it sync to IRD CBMS / need real-time validation?
- Is the e-commerce **Store Builder** in scope for the clone, or back-office only first?
- Multi-company: one company per deployment, or true multi-tenant with company switcher?
- Can we get a second, lower-privilege user login to map permission-gated differences?
- Chart of Accounts: use the reference's exact NFRS list? (can export from reference if so)
