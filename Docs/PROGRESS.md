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

### Session 3 — 2026-09-11 (deep discovery)
- Captured live API traffic. Findings → `Docs/REFERENCE-API-MAP.md` (new),
  `DISCOVERY-LOG.md` (session-3 addendum), `DATABASE.md` (76-model inventory),
  `WORKFLOWS.md` (GL posting W3–W8), `ARCHITECTURE.md` §0, `ASSUMPTIONS.md` (A3–A17).
- Key: Django+DRF, **schema-per-tenant**; 3 API families `/invoices/` `/slips/` `/ledgers/`;
  **real double-entry GL** (reports read the ledger); 3-level NFRS chart of accounts with
  enum codes; contacts = GL accounts; **IRD/CBMS** compliance fields; 76 backend models
  incl. Fixed Assets, Manufacturing, Workshop, Restaurant, Fuel, CRM, Budget verticals.
- Still to capture (during each module build): POST payloads, exact VAT/discount math,
  invoice-number format, `/users/permissions/my/` shape, per-report columns.

### Session 4 — 2026-09-11 (Module 1a — Settings: Fiscal Year + Tax + Company Info)
- Prisma: `FiscalYear` (+description, isClosed, `@db.Date`), new `TaxRate`, new `CompanyInfo`.
  Migration `20260910183808_settings_fiscalyear_tax_companyinfo`. Seed: 3 FYs, 3 system tax
  rates (VAT 13% / Exempt / Non-Taxable), demo CompanyInfo.
- `src/lib/bs-date.ts` — BS⇆AD via `nepali-date-converter` (store AD, display BS).
- `src/lib/crypto.ts` — AES-256-GCM at-rest encryption (CBMS password). Needs `APP_SECRET`.
- `src/server/settings/{schemas,service}.ts` — Zod + service layer (tx, audit, one-active-FY rule).
- API: `/api/settings/fiscal-years[/id]`, `/api/settings/tax-rates[/id]`, `/api/settings/company-info`.
- UI: `settings/layout.tsx` (permission-filtered sub-nav) + `components/ui.tsx` (Button, Card,
  Field, Input, Toggle, Modal, toast, `api()` wrapper) + 3 pages (fiscal-year, tax, company-info).
- Verified in browser + curl: CRUD works, validation (bad date range → 422), RBAC (cashier → 403),
  CBMS password stored encrypted (`iv:tag:cipher`), never returned. tsc/eslint/build green.
- **Not yet:** image uploads (logo/stamp/QR/signature), FY "Resync Opening" (needs GL), the
  other 11 Settings sub-pages (still stubbed).

### Client decisions (2026-09-11)
- **v1 scope:** Core accounting ERP **+ industry verticals** (Fixed Assets, Manufacturing/BOM,
  Workshop, Restaurant, Fuel/Token, Printing). **Out of v1:** CRM, Budget, Store Builder.
- **Tenancy:** single company per deployment (`companyId` column scoping — as scaffolded).
- **IRD/CBMS:** model the fields + build a stubbed integration seam; no real IRD calls in v1.
- **Reference test data:** OK to create sample records in the live reference app and leave them
  → capture exact `POST` payloads + calculation results per module.

### ⏭️ RESUME HERE (next session) — begin Phase 5 modules
Development proceeds **part by part** (client's instruction: one module per session, confirm each).
Recommended order & why:
  1. **Settings core:** ✅ Fiscal Year (BS⇆AD) · ✅ Tax rates · ✅ Company Info (+ IRD/CBMS,
     encrypted) — *done session 4*. ⬜ Users & Roles UI (permission-matrix editor) ·
     ⬜ Custom Fields · ⬜ Banks · ⬜ Bill Footer · ⬜ Invoice Setting · ⬜ Backup.
  2. **Accounts / GL (the spine):** `AccountHead`/`AccountGroup`/`Ledger` 3-level COA +
     NFRS seed · `Voucher`/`VoucherLine` + **`postVoucher()`** service (ΣDr=ΣCr) ·
     Contacts (customer/supplier ledgers) · Cash & Bank. Everything financial posts here.
  3. **Inventory:** Category, Unit, Warehouse, Product (GD/SR/EX, 3-level units, tax type),
     `StockMovement` ledger + `postStockMovement()`, opening stock.
  4. **Sales:** Quotation → Sales Order → **Sales Invoice** (server totals engine W4 +
     `postVoucher` + `postStockMovement` + numbering) → Receipt → Credit Note.
  5. **Purchase:** Purchase Order → Purchase Invoice (excise/custom duty, input VAT) →
     Payment → Debit Note → Goods Received / Import.
  6. **Vouchers UI:** Journal / Contra / Stock Journal (thin UI over `postVoucher`).
  7. **Reports:** Trial Balance → Ledger → P&L → Balance Sheet → Day Book → Stock Summary →
     VAT Return / Annexes → Aging. (All read GL / StockMovement.)
  8. **Dashboard** widgets (now real numbers exist).
  9. **Documents**, then **verticals** (Fixed Assets → Manufacturing → Workshop → Restaurant →
     Fuel/Token → Printing). *CRM, Budget, Store Builder = post-v1.*
- Each module: Prisma models → migration → Zod validators → service (tx, calls
  `postVoucher`/`postStockMovement`) → `/api/<domain>` routes (`requirePermission`) →
  UI page replacing the stub → Vitest (calc + posting) + Playwright (workflow).
- **Capture before building each:** that module's `POST` payload from the reference
  (drive the form, submit a throwaway record IF the client OKs test data, else read the
  form + JS). Add findings to `REFERENCE-API-MAP.md`.

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
1. **Scope / order** — confirm the module order above. Which of these are in v1 vs later:
   Store Builder (e-commerce), Fixed Assets, Budget (NGO funds), CRM, and the industry
   verticals (Workshop, Restaurant, Fuel/Token, Printing)?
2. **Multi-tenancy** — one company per deployment (our `companyId` model), or true
   schema-per-tenant + company switcher like the reference? Nestable parent/child companies?
3. **IRD / CBMS** — do you have CBMS API credentials + spec? Should v1 actually push invoices
   to IRD, or model the fields + stub the integration (recommended)?
4. **Invoice numbering** — required format (prefix, fiscal-year segment, width)? Confirm
   cancellation-not-deletion policy.
5. **Chart of Accounts** — OK to copy the reference's exact NFRS list (≈30 heads / 106 groups /
   185 ledgers)? We can scrape all 3 levels from the reference.
6. **Test data** — may we create a few throwaway records in the reference app to capture
   exact `POST` payloads and calculation results? (Otherwise we infer from forms + JS.)
7. **Second login** — a lower-privilege reference user (e.g. the Cashier) to map nav/permission
   differences precisely.
8. **VAT** — confirm 13% standard + 0% exempt is the whole picture (any excise/other rates you use).
