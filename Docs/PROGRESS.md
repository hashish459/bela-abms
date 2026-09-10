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

### Session 5 — 2026-09-11 (Module 2 — Accounts / General Ledger spine)
- **Scraped the reference's full NFRS chart of accounts** (Export endpoint): 36 account heads,
  106 groups, 181 ledgers → `app/prisma/data/nfrs-coa.ts` (auto-generated). Enums confirmed:
  `account_type` AS/LI/EQ/IN/EX, `current_account_type` CU/NC/O, `financial_account_type` FI/NF/O.
- Prisma: `AccountHead`, `AccountGroup`, `Ledger` (3-level, ledgers double as customer/supplier
  contacts), `Voucher` + `VoucherLine`, `NumberSequence`. Migration `accounts_general_ledger`.
  Seed now builds the whole NFRS COA for the demo company + an "Opening Balance Adjustment"
  suspense ledger.
- **`src/server/accounts/gl.ts` — the GL core:**
  - `postVoucher(tx, …)` — THE single writer of ledger entries. Enforces Σdebit = Σcredit,
    validates ledgers/fiscal-year, allocates a gap-free number (`JV-2083/84-0001`), audits.
  - `postOpeningBalance()` — opening balances post a balanced OPENING voucher vs the suspense
    account, so the trial balance always ties.
  - `reverseVoucher()` — mirror-post for cancellations.
  - `trialBalance()` / `ledgerStatement()` — read **purely from VoucherLine** (opening balances
    included as OPENING vouchers; `Ledger.openingBalance` is reference metadata only).
- `src/server/accounts/service.ts` — chart-of-accounts tree, ledger CRUD (auto-code
  `<group>-<seq>`, blocks delete if used), contacts (customer/supplier under TRR-01/TRP-01),
  manual vouchers (journal + contra; contra restricted to cash & bank).
- API: `/api/accounts/{chart,groups,ledgers[/id],contacts[/id],vouchers[/id]}`,
  `/api/reports/{trial-balance,ledger/[id]}`. `src/lib/guard.ts` helper +
  `src/lib/fiscal-year.ts` (active FY).
- UI: Accounts section (`TabNav`) + Chart of Accounts (collapsible AS/LI/EQ/IN/EX tree,
  Add Account) + Contacts (Customers/Suppliers tabs, full contact form) + Vouchers section +
  Journal/Contra Voucher (double-entry grid, live balance check, `LedgerPicker` combobox) +
  Trial Balance report (grouped, print). `src/components/{ledger-picker,tab-nav}.tsx`.
- **Verified via curl + browser:** balanced JV posts (`JV-2083/84-0001`), unbalanced → 422,
  trial balance ties, opening balances flow through GL, ledger statement runs, cashier RBAC
  (403 on chart, 200 on contacts). tsc + eslint + build green.
- **Gaps:** no Vitest yet for `postVoucher` (verified manually); Cash & Bank + Balance
  Confirmation pages still stubbed; ledger-picker shows group name a bit cramped; no
  voucher edit/delete UI (reverse only via API).

### Session 7 — 2026-09-11 (Module 4 — Sales)
- Prisma: unified `SalesDoc` (type QUOTATION/SALES_ORDER/INVOICE/CREDIT_NOTE) + `SalesDocItem`
  + `Receipt`. Enums SalesDocType/Status, PaymentMode. `voucherId`/`cogsVoucherId` links.
  Migration `sales`. Seed: added `COS-01-0100 Cost of Goods Sold` ledger.
- **`src/server/sales/calc.ts` — the totals engine (PURE, 10 Vitest tests, all green):**
  line net = qty×rate − line discount (tax-inclusive lines back the VAT out); header discount
  reduces the taxable base only, apportioned pro-rata across taxable lines, VAT recomputed;
  non-taxable lines untouched; grand = non-taxable + taxable + VAT. Rounds VAT to 2dp.
- **`src/server/sales/service.ts`:**
  - `createInvoice` — the core. In one tx: SalesDoc + items → stock OUT (goods) →
    `postVoucher(SALES)` Dr customer/cash / Cr Sales / Cr VAT → **perpetual COGS**
    (`weightedAverageCost` → Dr COGS / Cr Inventory) → cash sale also books a Receipt.
    Gap-free number `SA-2083/84-0001`. **Immutable — no update/delete route exists.**
  - `createReceipt` — Dr cash/bank / Cr customer; updates invoice amountPaid + status
    (OPEN→PARTIALLY_PAID→PAID); rejects over-payment.
  - `createCreditNote` — sales return. Stock back IN at current avg cost, reverse GL
    (Dr Sales Return + Dr VAT / Cr customer), reverse COGS; caps at the invoice's remaining
    value; flips invoice → RETURNED / CANCELLED.
  - `createDraft` (quotation / sales order — no GL/stock), `convertDoc` (QU→SO→INVOICE).
- `src/server/inventory/cost.ts` — `weightedAverageCost` = Σ(inbound qty×unitCost) ÷ Σ inbound qty.
- API: `/api/sales/{calc,invoices[/id],quotations,orders,receipts,credit-notes,docs/[id]/convert}`.
- UI: Sales section (TabNav) + Sales Invoice (list + full form) + Quotation/Sales Order
  (`DraftWorkspace`, convert buttons) + Receipts + Credit Note (pick invoice → adjust return
  qty). `components/{sales-line-editor,product-picker,ledger-picker}.tsx` — pickers now render
  in a **portal** so dropdowns escape modal clipping.
- **Verified (curl + browser):** credit invoice → Dr AR 2260 / Cr Sales 2000 / Cr VAT 260,
  COGS Dr/Cr at weighted-avg cost; cash sale (status PAID, Dr Cash); receipt Rs 500 →
  PARTIALLY_PAID, outstanding correct; credit note (return 3/10) → GL + stock + COGS reversed,
  trial balance still ties; over-limit receipt & credit-note rejected; PATCH/DELETE on an
  invoice → **405**. tsc + eslint + build + 10 calc tests green.
- **Gaps:** invoice detail/print view (list only); Chalani/Cheque/Proforma/Receivable pages
  stubbed; `vitest` DB-integration tests for the posting flow (verified manually); the "Convert
  to Invoice" flow currently just navigates to the invoice tab (doesn't pre-fill the form yet).

### Session 6 — 2026-09-11 (Module 3 — Inventory)
- Prisma: `ProductCategory` (self-nesting), `Unit`, `Warehouse`, `Product` (kind GOODS/SERVICE/
  EXPENSE, 3-level units + conversions, `taxRateId` + `taxBasis` INCLUSIVE/EXCLUSIVE +
  `isNonTaxable`, attributes size/color/flavour/dftqc/madeFrom/expiry), `ProductBatch`,
  **`StockMovement`** (signed qty), `InventoryAdjustment` + lines. Migration `inventory`.
  Seed: 9 units + Default Warehouse.
- **`src/server/inventory/stock.ts` — the stock engine:**
  - `postStockMovement(tx, …)` — THE single writer of stock qty. Signed per `kind` (IN adds,
    OUT removes), rejects SERVICE/EXPENSE, blocks overselling unless `allowNegative`.
  - `onHandQty()`, `stockSummary()`, `stockByWarehouse()` — on-hand = Σ movements, never a field.
- `src/server/inventory/service.ts` — CRUD for category / unit / warehouse / product
  (opening stock → OPENING StockMovement) + inventory adjustment (INCREASE/DECREASE/DAMAGE/
  EXPIRY/RECOUNT/OPENING → posts ADJUSTMENT_IN/OUT movements, `ADJ-00001`).
- API: `/api/inventory/{categories,units,warehouses,products,adjustments}`,
  `/api/reports/stock-summary`. Fixed seed menu routes (`unit-measurement`, `inventory-adjustment`,
  `inventory-transfer`).
- UI: Inventory section (`TabNav`) + Product Category + Units + Warehouse + Products
  (Goods/Services/Expense tabs, live search, full Add Product form) + Inventory Adjustment
  (line grid + `ProductPicker`) + Stock Summary report. `components/product-picker.tsx`.
- **Verified via curl + browser:** product + opening stock (100), DAMAGE adjustment (−30 →
  on hand 70), over-decrement blocked ("Not enough stock"). tsc + eslint + build green.
- **Gaps:** stock write-offs don't yet post a GL valuation entry (Dr Loss / Cr Inventory) —
  deferred to the COGS/inventory-valuation pass; Warehouse Transfer + Inventory Transfer pages
  stubbed; no product edit UI (API only); batch tracking modelled but not surfaced.

### Vendor docs received (2026-09-11) — `Docs/vendor/`
- `SOFTWARE-SPEC.txt`: stack = Next.js + Django + FastAPI + PostgreSQL + JWT + Docker + K8s +
  Prometheus/Grafana. User roles **Admin / Manager / Accountant / Customer**. 1000 concurrent,
  <2s. Reports: Sales/Sales Return/Purchase/Purchase Return/payments/customer.
- `INVOICE-IMMUTABILITY.txt`: invoices are **immutable** — DB blocks UPDATE/DELETE, no user has
  edit/delete rights, all attempts audited. Corrections via Credit/Debit Note only.
- `USER-MANUAL.txt`: step-by-step for Sales Invoice, Credit Note, Purchase Invoice, Debit Note,
  Sales Report — read before building the Sales/Purchase modules.

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
  2. **Accounts / GL (the spine):** ✅ 3-level NFRS COA + seed · ✅ `Voucher`/`VoucherLine` +
     `postVoucher()` (ΣDr=ΣCr) · ✅ Contacts · ✅ Journal/Contra voucher UI · ✅ Trial Balance
     — *done session 5*. ⬜ Cash & Bank page · ⬜ Balance Confirmation · ⬜ Vitest for GL.
  3. **Inventory:** ✅ Category · ✅ Unit · ✅ Warehouse · ✅ Product (GOODS/SERVICE/EXPENSE,
     3-level units, tax basis) · ✅ `StockMovement` + `postStockMovement()` · ✅ opening stock ·
     ✅ Inventory Adjustment · ✅ Stock Summary — *done session 6*. ⬜ Warehouse/Inventory
     Transfer pages · ⬜ GL valuation entry on write-offs · ⬜ product edit UI.
  4. **Sales:** ✅ Quotation → Sales Order → **Sales Invoice** (calc engine + `postVoucher` +
     `postStockMovement` + perpetual COGS + numbering + immutable) → ✅ Receipt → ✅ Credit Note
     — *done session 7*. ⬜ invoice detail/print · ⬜ Chalani/Cheque/Proforma.
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
