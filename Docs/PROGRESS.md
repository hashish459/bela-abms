# PROGRESS — session log & roadmap

> **Read this first.** Hand-off document between working sessions. Update at end of every session.

## Current status: `PHASE 3 — FOUNDATION (done)` → next: PHASE 1 deep discovery + PHASE 5 modules

Order (from brief): INSPECT → ARCHITECTURE → FOUNDATION → CORE UI → MODULES →
CROSS-MODULE WORKFLOWS → ENTERPRISE HARDENING → QA.

Project now lives at **`D:\Bela_ABMS\`** (renamed from the `&`-containing path). App in `app/`.

---

## Session log

### Session 16 — 2026-09-11 (Enterprise Hardening pass — security + performance)
The brief's own roadmap (`Docs/MASTER-PROMPT.md` §9, "Enterprise hardening") calls for
exactly this phase once the modules are built — client asked to proceed with "modern
corporate standards." Rather than guess what to harden, ran a real audit (Explore agent)
against the brief's own checklist with file:line evidence for every claim, then fixed
every genuine gap found. Full audit findings are in this session's transcript; summary:

**Fixed:**
- **CSRF protection** (`src/lib/cookies.ts` `csrfCookie()`, `src/lib/session.ts`
  `issueSession()`, `src/lib/guard.ts` `assertCsrf()`): double-submit token, issued as a
  readable (non-httpOnly) cookie at login/refresh alongside the existing httpOnly
  access/refresh cookies. `guard()` now verifies the `x-csrf-token` header matches the
  cookie for every non-`"read"` action — an attacker can make a victim's browser *send*
  the cookie automatically but can't *read* it cross-origin to also set the matching
  header. Defense-in-depth on top of the existing `SameSite=Lax`, which already blocks
  most cross-site mutation attempts for this same-origin app. Client-side, `api()`
  (`src/components/ui.tsx`) reads the cookie and attaches the header automatically — no
  per-call-site changes needed anywhere. Verified via curl: missing token → 403, wrong
  token → 403, correct token → succeeds, GET reads → unaffected (by design).
- **Rate limiting on `POST /api/auth/refresh`** (`src/lib/rate-limit.ts`, new in-memory
  fixed-window limiter — appropriate given this app's single-instance-per-company
  deployment model, no Redis/horizontal scaling to coordinate): this was the one
  unauthenticated-reachable endpoint with no throttle at all (login already had one via
  `LoginAttempt`). 20 requests/min per IP. Verified via curl: 21st request in a minute
  returns 429.
- **N+1 query pattern in Sales COGS calculation** (`src/server/sales/service.ts`
  `createInvoice` ~line 297, `createCreditNote` ~line 527): both loops called
  `weightedAverageCost()` — itself a real DB query — once per LINE ITEM sequentially,
  so a 20-line invoice cost 20 round trips. Fixed by deduping to unique product IDs and
  batching the lookups through `Promise.all`, mirroring the pattern already used
  correctly in `manufacturing/service.ts`'s BOM cost rollup. Verified: a multi-line
  invoice still posts with correct COGS and the trial balance still balances exactly.
- **5 Settings routes weren't using `guard()`** (`company-info`, `fiscal-years[/id]`,
  `tax-rates[/id]`) — these predate `guard()` (added in session 5) and still inlined
  `requireSession()`+`requirePermission()` directly, which meant they silently missed the
  new CSRF check. Refactored all 5 to use `guard()` like every other route in the
  codebase — closes the CSRF gap for them and removes the last inconsistency in how
  routes check permissions.
- **Missing composite index**: `BillOfMaterial` had only `@@index([companyId])` despite
  having an `isActive` filterable field, unlike the matching pattern already used on
  `FixedAsset`/`JobCard`. Added `@@index([companyId, isActive])` — preventive (today's
  `listBoms` doesn't filter on `isActive` yet, but an "active only" toggle is an obvious
  near-term addition and the index should already be there when it lands). 1 migration.
- **Prisma error leakage (belt-and-suspenders)**: `handler()` (`src/lib/api.ts`) already
  never leaked stack traces or raw error messages (confirmed by audit — this was already
  fine), but unhandled Prisma errors all fell into one generic 500. Added a narrow
  `PrismaClientKnownRequestError` branch mapping `P2002`→409 "already exists",
  `P2025`→404 "not found", `P2003`→409 "conflicts with a related record" — friendlier
  UX, still without ever echoing Prisma's own message or `meta` (which can name internal
  column/table identifiers) back to the client.

**Confirmed already fine (audit found no gap, no action taken):** input validation
(Zod everywhere), parameterized queries (Prisma ORM only, the one raw-SQL surface is
already sandboxed — session 10's Database Console), IDOR protection (every `[id]` route
scopes by session-derived `companyId`, spot-checked across 4 verticals), mass assignment
(every service builds its Prisma `data:` object field-by-field from validated input, no
`...body` spreads), indexes on the other 3 newest models (FixedAsset/ProductionOrder/
JobCard all already match the established pattern), secret exposure (no `console.log` of
sensitive data anywhere, `.env.example` has only placeholder values).

tsc + eslint + build + 38/38 existing tests green (no test-worthy pure-function logic
changed — the N+1 fix only changed query *shape*, not calculation results, which the
existing Sales test suite plus a live curl regression already covers). Verified live via
curl: CSRF enforcement (4 scenarios), refresh rate limiting (429 after 20/min), refactored
Settings routes still return correct data, multi-line invoice COGS + trial balance still
correct after the N+1 fix.

**Gaps knowingly left for a future pass** (per the audit, all assessed as low-priority):
no rate limit on `/api/system/query` (already RBAC-gated to Administrator only, so
exploitability is insider-only); no rate limit on general CRUD endpoints (same reasoning
— authenticated + RBAC'd, risk is insider-DoS at worst); no response caching anywhere
(no evidence of a performance problem yet, premature to add); no monitoring/APM hooks
(would need an external service, out of scope for this environment).

### Session 15 — 2026-09-11 (Branding + theming/accessibility + status pages)
Cross-cutting UI/UX pass, client-requested directly (not a v1 accounting module):
real company branding (Bela Nepal Industries' own navy/orange logo, replacing the
reference app's arbitrary cyan), a full appearance/accessibility system (theme, accent,
font, text size, reduce-motion, language), custom 404/error pages, branded loading
screens, and a toast-position fix.

- **Branding — blocked on one file.** The client attached their logo inline in chat;
  Claude Code has no mechanism to extract image bytes from a chat message into a file
  (Read only reads files that already exist on disk) — asked the client to save it to
  `app/public/logo.png`. Built `src/components/brand-logo.tsx` (`<BrandLogo>`) so every
  placement (login, sidebar header, 404, loading, global-error) picks it up with zero
  further code changes the moment the file lands, no crop (object-contain, native aspect
  ratio, matches the "use it exactly as-is" instruction) — falls back to the old "ब"
  lettermark chip until then, so the app never looks broken in the interim. **Found and
  fixed a real bug while building this:** using the rendered `<img>`'s own `onError` fails
  for an SSR'd image — the browser starts the request the instant it parses the HTML,
  before React hydrates and attaches the handler, so a fast 404 is missed and the
  browser's broken-image glyph is left on screen. Fixed by probing with a detached
  `new Image()` in a `useEffect` instead, decoupled from the actually-rendered tag.
- **Removed unused `create-next-app` starter SVGs** from `public/` (file/globe/next/
  vercel/window.svg — never referenced anywhere).
- **Theme/accent/font/text-size/language system** (`src/lib/preferences.tsx`,
  `src/lib/i18n.ts`, `src/components/appearance-panel.tsx`): light/dark/system (a
  blocking inline `<script>` in `layout.tsx`'s `<head>` applies the saved choice before
  first paint — no flash of the wrong theme for returning visitors), 5 accent presets
  (Bela Orange is now the *default*, replacing the reference's cyan, which survives as
  the "Ocean" preset), 4 fonts (DM Sans/Inter/Poppins/Noto Sans, the latter for
  Devanagari coverage), 4 text sizes (scales the `<html>` root `%`, so every Tailwind
  rem-based class across the whole app scales — not just a handful of hand-picked
  components), a reduce-motion toggle, and English/नेपाली. All switched purely via
  `data-*` attributes on `<html>`, all persisted to `localStorage`, surfaced via a
  palette-icon panel in the dashboard header *and* on the login page (so appearance can
  be set before authenticating). **Found and fixed a real persistence bug**: the
  "save prefs to storage" effect fired on mount with default values before the
  "load prefs from storage" effect's deferred read could run, silently over-writing every
  returning visitor's saved choices back to defaults on every page load — fixed by
  gating the save effect on a `hydrated` flag set only after the load has completed.
  Verified via direct `localStorage`/attribute inspection (not just screenshots, which
  intermittently rendered stale frames in this session's browser tool) that a full set of
  non-default choices survives a hard page reload correctly.
- **Language scope, stated honestly**: translates the app's chrome only — shell
  (sidebar/header labels, sign out), the login page, the Appearance panel itself, and the
  404/error pages. Translating every dashboard module's own content (30+ pages) is a
  much larger follow-up not attempted here; those pages render in English regardless of
  the language setting until that work happens. Documented in `src/lib/i18n.ts` itself so
  a future session doesn't assume more coverage exists than actually does.
- **Custom status pages**: `src/app/not-found.tsx` (checks session server-side to decide
  "Back to Dashboard" vs "Back to Login"), `src/app/error.tsx` (client, `reset()` wired to
  a retry button), `src/app/global-error.tsx` (catches a crash in the root layout itself —
  deliberately self-contained with its own `<html>/<body>`, since it fully replaces the
  root layout including `PreferencesProvider` and the theme-init script; renders in
  default light styling on purpose, prioritizing "definitely works even when everything
  else is broken" over full theming). All on-brand: logo, accent-tinted glow, pulsing
  compass icon for 404.
- **Branded loading**: `src/app/loading.tsx` (full-page splash, shown before the app
  shell itself has resolved — e.g. first navigation or hard refresh) and
  `src/app/(app)/loading.tsx` (a lighter inline version shown inside the shell — sidebar/
  header stay visible — while an individual dashboard page's own data is loading).
- **Toast position fix** (the client's actual ask: "info popup box... currently is
  center bottom"): moved from `bottom-4` to a `top-20` stack (clears the 56px dashboard
  header with room to spare), rewrote `toast()` in `src/components/ui.tsx` to support
  multiple simultaneous toasts stacking vertically instead of overlapping (a latent bug
  in the original single-fixed-position implementation), added a check/warning icon and
  a fade+slide entrance/exit animation gated behind the new reduce-motion preference.
- tsc + eslint + build + 38/38 existing tests green (no server-side logic touched this
  session — purely client-side presentation/UX — so no new Vitest coverage needed).
  Verified live: dark mode, all 5 accents, all 4 fonts, all 4 text sizes, reduce motion,
  both languages, the 404 page, and toast stacking — all confirmed via a mix of
  screenshots and direct DOM/localStorage inspection (screenshots proved unreliable/stale
  intermittently in this session's browser tool; state inspection caught real bugs the
  screenshots initially masked).
- **Gaps / follow-ups**: logo file still pending from the client; no favicon/`app/icon.png`
  update yet (needs the same source art — once `public/logo.png` exists, a matching
  `src/app/icon.png` can replace the generic Next.js favicon); dashboard content
  (non-chrome page text) is not translated; no "Appearance" entry under Settings itself
  (the header/login panel is the only surface — considered sufficient for now, easy to
  duplicate onto a Settings sub-page later if wanted); no true multi-tenant per-user
  server-persisted preference (this is `localStorage`-only, per-browser, matching how the
  system currently has no per-user profile settings storage at all).

### Session 14 — 2026-09-11 (Workshop vertical)
Third industry vertical. Same "reference nav exposed almost nothing" situation as Fixed
Assets and Manufacturing (Docs/DISCOVERY-LOG.md only ever surfaced "workshop job card /
technician" from the 76-model list) — but this one turned out to need **zero new ledgers**,
because a Job Card is architecturally just a pre-financial working document (like Quotation/
SalesOrder) that becomes a real Sales Invoice on completion, by calling
`src/server/sales/service.ts`'s exported `createInvoice()` **directly** rather than
reimplementing any billing/GL/stock/COGS/VAT logic.

- Prisma: `Technician` (simple master data), `JobCard` + `JobCardItem` (customer/vehicle/
  complaint intake + an *optional* estimate). New enums `JobCardStatus`
  (OPEN/BILLED/CANCELLED) and `JobCardItemType` (PART/LABOR — a workshop-internal grouping
  only, has no bearing on how a line posts once billed). 1 migration. No changes to Sales,
  Purchase, or any other already-shipped module — this vertical is purely additive, calling
  existing exported functions rather than touching their internals.
- **Key design decision:** the job card's stored `items` are the *original intake estimate*
  only. "Complete & Bill" takes a **separate, fresh** items array (what was actually done —
  real repair work often differs from the initial estimate once the vehicle is inspected) and
  passes it straight through to `createInvoice()`; nothing gets copied back onto the `JobCard`
  row. The detail UI links a BILLED job card to Sales › Sales Invoice to see the real charge,
  since no per-invoice detail/print page exists yet (a pre-existing gap from session 7, not
  new here).
- **`src/server/workshop/service.ts`**: `createJobCard` (validates any referenced products/
  technicians exist; customer is a ledger or a walk-in name, matching Sales' own pattern
  exactly). `billJobCard` — the entire "posting" logic is one call to `createInvoice()` with
  the job card's customer info and the final items translated into invoice lines (PART lines
  optionally carry a GOODS `productId` and consume stock exactly like any sale; LABOR lines
  behave like a SERVICE line, no stock). `cancelJobCard` for OPEN cards that never proceed —
  trivial, since nothing was ever posted to the GL.
- API: `/api/workshop/{technicians[/id],job-cards[/id],job-cards/[id]/bill,job-cards/[id]/cancel}`.
  New permission group `workshop` (`job_card`, `technician`) — not granted to Cashier.
- UI: new "Workshop" nav item → Job Card (list + intake form with an inline Parts/Labor items
  editor shared between intake and billing + Complete & Bill + Cancel) + Technician (simple
  list/add/edit, mirrors the existing Warehouse manager pattern exactly).
- **Verified end-to-end via curl with hand-calculated numbers**: opened a job card for a
  Toyota Hiace with a brake noise complaint (empty estimate, to test that path); billed it
  with 2 Brake Pad Sets (a GOODS part, stock-tracked) + 2 hours of labor (a SERVICE product,
  technician-attributed) at VAT 13% — the resulting Sales Invoice showed exactly
  taxable 4,000.00 / VAT 520.00 / grand total 4,520.00 (hand-verified: 2×1500 + 2×500 = 4000,
  ×13% = 520), status PAID with an auto-booked cash receipt (Sales' existing cash-sale
  behavior, untouched), stock dropped exactly 20→18, and the job card correctly flipped to
  BILLED with its `invoiceId` linked. Confirmed billing an already-CANCELLED job card is
  rejected. tsc + eslint + build + 38/38 tests green (no new pure-calc tests needed — the only
  workshop-specific math is a trivial display-only estimate sum; the real posting math is
  100% Sales' already-tested `calcSalesTotals`). RBAC verified both ways.
- **Gaps:** no job-card editing after creation (matches the existing Quotation/SalesOrder
  precedent of create-once-then-convert, not a new limitation); no technician labor-cost/
  commission reporting; no vehicle service-history lookup by registration number.

### Session 13 — 2026-09-11 (Manufacturing vertical)
Second industry vertical. Same approach as Fixed Assets: the reference app's own nav never
exposed a manufacturing workflow (Docs/DISCOVERY-LOG.md — "material bill = BOM,
manufacture-demolish" was all that surfaced from the 76-model list), so this was built from
the standard Raw Material → WIP → Finished Goods costing flow — but keyed onto **real ledgers
already sitting in the scraped COA since session 5** (`INV-01/02/03`, `COS-02-0004`), which
were clearly provisioned for exactly this. `StockMovementKind.MANUFACTURE_IN`/
`MANUFACTURE_OUT` were also already in the Phase-3 schema, unused until now.

- **`Product.inventoryRole`** (new enum `InventoryRole`: `FINISHED_GOODS` default /
  `RAW_MATERIAL`) — the one piece of surgery on an already-shipped, already-verified module.
  `src/server/purchase/service.ts` (`createPurchaseInvoice` + `createDebitNote`) now splits
  the goods-lines inventory debit/credit by each line's resolved role instead of one hardcoded
  `INV-01-0001` constant. Every existing product defaults to `FINISHED_GOODS`, so this is
  additive and changes nothing for any product created before this field existed — verified
  by re-running the full existing test suite (still 8/8 purchase, 10/10 sales) plus a live
  curl regression check that an ordinary purchase still posts to Finished Inventory unchanged.
- Prisma: `BillOfMaterial` + `BomComponent` ("produce `outputQty` of a FINISHED_GOODS product
  per batch from these RAW_MATERIAL quantities" + a flat `laborCostPerBatch`),
  `ProductionOrder` + `ProductionOrderItem` (snapshot of what was actually consumed, at the
  weighted-average cost in effect at that moment — mirrors `SalesDocItem`/`PurchaseDocItem`).
  New `VoucherType.MANUFACTURE` (prefix `MO-`). 1 migration.
- **`src/server/manufacturing/calc.ts`** (pure, 7 Vitest tests): `calcProductionCost()` scales
  every component and the labor allowance by `batches`, derives `unitCost = (materialCost +
  laborCost) ÷ outputQty` — the value fed to the output's stock movement and GL debit.
- **`src/server/manufacturing/service.ts`**: `createBom` (validates output is a FINISHED_GOODS
  GOODS product, components are GOODS, no self-referencing BOM). `createProductionOrder` —
  looks up each component's **current weighted-average cost** (`src/server/inventory/cost.ts`,
  reused with zero changes), stock OUT the components / stock IN the output, then posts ONE
  voucher: Dr WIP (material+labor) → Cr each component's role-resolved inventory ledger + Cr
  Salary & Wages (labor) → Dr the output's inventory ledger (material+labor) → Cr WIP. WIP
  nets to zero within the voucher but is posted through explicitly rather than netted away,
  since the reference COA provides a dedicated ledger for it.
- API: `/api/manufacturing/{boms[/id],production-orders[/id]}`. New permission group
  `manufacturing` (`bill_of_materials`, `production_order`) — not granted to Cashier.
- UI: new "Manufacturing" nav item → Bill of Materials (list + add form: output product,
  output qty/batch, labor cost/batch, dynamic component rows) + Production Order (list + run
  form + click-through detail showing every component consumed at its cost). Products page
  gained an "Inventory Role" selector (Finished Goods / Raw Material) for GOODS products.
- **Verified end-to-end via curl with hand-calculated numbers**: created Raw Material
  products (Steel Sheet, Bolt Set) and a Finished Good (Steel Bracket); a purchase of more
  Steel Sheet correctly landed on Raw Material Inventory (11,000.00) leaving Finished
  Inventory's balance for every other product untouched; a BOM (1 Steel Sheet + 4 Bolts →
  2 Brackets, labor Rs.100/batch) run for 3 batches produced exactly 6 brackets at a
  hand-verified unit cost of 173.3333 (materialCost 740.00 = 3×206.6667 weighted-avg Steel
  Sheet + 12×10.0000 Bolt Set, laborCost 300.00, totalCost 1040.00 ÷ 6) — every GL line
  (Raw Material Inventory credited 740, Salary & Wages credited 300, WIP Dr/Cr 1040 each,
  Finished Inventory debited 1040) and every stock quantity (Steel Sheet 150→147, Bolts
  500→488, Brackets 0→6) matched exactly, trial balance balanced throughout. 38/38 tests
  (10 sales + 8 purchase + 13 assets + 7 manufacturing) green. RBAC verified both ways.
- **Gaps:** no multi-level BOM UI warning (a FINISHED_GOODS product used as a BOM component —
  e.g. a sub-assembly — is technically supported by the service layer's role-aware ledger
  routing, but untested); no "reverse manufacture" / demolish workflow (the reference's
  `manufacture demolish` counterpart — disassembling a finished good back into components);
  no production-order cancellation/reversal (Sales/Purchase-style Credit/Debit Note
  equivalent); no live cost preview before submitting a Production Order.

### Session 12 — 2026-09-11 (Fixed Assets vertical)
First industry vertical (v1 scope: core ERP + Fixed Assets/Manufacturing/Workshop/
Restaurant/Fuel/Printing). The reference app's own nav never exposed enough of this module
to reverse-engineer a workflow from (Docs/ASSUMPTIONS.md A13 — "minimal in nav"), so this was
built from standard NFRS fixed-asset accounting — but keyed onto **real ledger codes already
scraped from the reference's own chart of accounts** in session 5 (`PPE-01..09`, `ADE-06`,
`ADE-17`, `OIC-01`), not invented ones. Full writeup in Docs/DATABASE.md.

- Prisma: `FixedAsset` (subsidiary register — never its own GL ledger, mirrors how `Product`
  works for Inventory), `AssetDepreciationEntry` (subsidiary ledger — accumulated depreciation
  is always `Σ entries`, mirrors `StockMovement`'s "derived, never mutable" pattern),
  `DepreciationRun` (one GL voucher per batch run). New enums `AssetCategory` (9 values = the
  real NFRS PPE sub-groups), `DepreciationMethod`, `AssetStatus`, `DisposalType`. Extended
  `VoucherType` with `ASSET`/`DEPRECIATION`/`ASSET_DISPOSAL` (own number prefixes FA/DEP/AD),
  matching the existing per-document-type pattern. 3 migrations (models, enum values, one
  nullability fix caught before it shipped).
- **`src/server/assets/ledgers.ts`** — the category→ledger map, hardcoded from the scraped
  COA: Building→PPE-01, Computer→PPE-02, Furniture&Fixture→PPE-03, Land→PPE-04 (never
  depreciated — no accum-dep/expense ledger exists for it under NFRS), Leasehold Dev→PPE-05,
  Office Equipment→PPE-06, Other Assets→PPE-07, Plant&Machinery→PPE-08, Vehicles→PPE-09, each
  paired with its `ADE-06-000x` "Depreciation On …" expense ledger. Disposal gain/loss →
  `OIC-01-0002` "Profit On Sale Of Assets" / `ADE-17-0001` "Loss On Sale Of Assets".
- **`src/server/assets/calc.ts`** (pure, 13 Vitest tests) — `monthsBetween()` (whole completed
  calendar months only — a partial month is skipped this run, not double-charged next time)
  and `calcDepreciation()`: Straight-Line = `(cost−salvage)÷usefulLifeMonths×months`;
  Written-Down-Value = `bookValue×annualRate%×(months÷12)`; both capped so book value never
  drops below salvage.
- **`src/server/assets/service.ts`**: `createFixedAsset` (Dr Asset-at-cost / Cr
  Supplier-or-Cash-Bank), `runDepreciation` (batches every due asset into ONE voucher with
  lines grouped per category: Dr Depreciation Expense / Cr Accum. Depreciation — rejects if
  nothing is due, preventing an accidental duplicate run), `disposeAsset` (auto-posts a final
  partial-period catch-up depreciation first, then Dr Accum.Dep [full] + Dr Proceeds [if any]
  + Dr Loss-or-Cr Gain / Cr Asset-at-cost [full] — the loss/gain plug is whichever side the
  math lands on).
- API: `/api/assets` (list/create), `/api/assets/[id]` (detail + full depreciation history),
  `/api/assets/[id]/dispose`, `/api/assets/depreciation-runs` (list/run). New permission group
  `fixed_assets` (`asset_register`, `depreciation`) — **not** granted to Cashier.
- UI: new "Fixed Assets" top-level nav item → Asset Register (list, Add Asset modal with
  category-conditional straight-line/WDV fields, click-through detail modal showing full
  depreciation history, per-row Dispose) + Depreciation (run history, "Run Depreciation" modal).
- **Verified end-to-end via curl with hand-calculated numbers** — created a Vehicle
  (straight-line, cash), Office Equipment (WDV, credit), and Land (never depreciated):
  acquisition postings landed on the exact expected PPE ledgers; a depreciation run charged
  67,500.00 (Vehicle, 3 months × Rs.22,500/mo) + 5,333.33 (Photocopier, WDV prorated 4/12) =
  72,833.33 — both hand-verified exactly; re-running the same date correctly rejected
  ("nothing due"); disposing the Vehicle two months later auto-posted a 22,500 catch-up
  entry, then correctly computed book value 1,410,000 and a **10,000 loss** against
  1,400,000 proceeds — Dr Accum.Dep 90,000 + Dr Cash 1,400,000 + Dr Loss 10,000 = Cr Vehicles
  1,500,000, trial balance balanced throughout every step. tsc + eslint + build +
  **31/31 tests** (10 sales + 8 purchase + 13 assets) green. RBAC verified both ways (Cashier's
  `/api/menu` omits Fixed Assets entirely; a direct curl to `/api/assets` as Cashier gets 403).
- **Gaps:** no "capitalize from an existing Purchase Invoice" integration (assets are created
  directly, not converted from a PurchaseDoc line) — noted as a possible future enhancement,
  not attempted this session; no bulk asset import; no asset transfer between locations.

### Session 11 — 2026-09-11 (Module 7 — Dashboard KPIs)
- **`src/server/dashboard/service.ts`** (new): `salesSummary`/`purchaseSummary` (net of
  Credit/Debit Notes, FY-to-date), `cashAndBankBalance` (Σ Dr−Cr across every ledger under the
  `CCE` account head), `salesTrend` (zero-filled daily net sales, trailing N days),
  `lowStockAlerts` (GOODS products at/below `reorderPoint`). All pure read functions reused
  alongside the existing `profitAndLoss`/`receivablesAging`/`payablesAging`
  (`src/server/reports/service.ts`) and `listSalesDocs`/`listPurchaseDocs` — no duplicated
  business logic, the dashboard is just a different lens on the same data.
- **`dashboard/page.tsx`** rewritten from the old "accessible-module overview" placeholder to
  real, **permission-scoped** KPI cards (Net Sales, Net Purchases, Net Profit, Cash & Bank,
  Receivables/Payables Outstanding, Low Stock Alerts, Audit Log count), a 30-day sales trend
  bar chart (`src/components/bar-chart.tsx`, dependency-free inline SVG — no chart library
  added), and Recent Sales/Purchase Invoices + Top Outstanding Receivables + Low Stock lists.
  Every section is individually gated behind the same permission keys the underlying report
  API enforces (`sales.sales_invoice`, `purchase.purchase_invoice`, `reports.accounting_reports`,
  `reports.receivable_reports`, `reports.payable_reports`, `inventory.product_item`) — a
  Cashier's dashboard genuinely only renders Sales + Low Stock + Audit count, not just visually
  hidden cards computed anyway.
- **Bug found and fixed during browser verification:** a hydration-mismatch crash on first
  load, traced via `preview_logs` to `src/components/bar-chart.tsx`'s `<title>` tooltip —
  `<title>{p.date}: Rs. {p.amount.toLocaleString()}</title>` has multiple JSX children
  (text + expression + text + expression), which React explicitly does not support inside
  `<title>` (must be a single string). Fixed with a template literal:
  `` <title>{`${p.date}: Rs. ${p.amount.toLocaleString("en-US")}`}</title> `` — also pinned
  the locale explicitly (`"en-US"`) on this and two other `toLocaleString()` calls added this
  session, since an unpinned locale is a second, independent way to get server/client output
  drift. Confirmed fixed by checking the Next.js dev-overlay's shadow DOM for an active error
  badge after a full server restart (Turbopack HMR had gotten stuck serving stale code for the
  first fix attempt — a plain `preview_stop`/`preview_start` cycle resolved that separately).
- **Verified in browser** as both Administrator (all 7 KPI cards + chart + 3 recent-activity
  panels) and Cashier (Net Sales + Low Stock + Audit Log only, everything else correctly
  absent — not hidden via CSS, never fetched). tsc + eslint + build + 18/18 tests green.
- **Note on the demo data:** Cash & Bank Balance shows a large negative figure (-100,838.20).
  This is mathematically correct given what's in the ledger — the demo dataset (session 10)
  never posted an opening "owner's capital" entry into Cash/Bank, so several real cash
  payments (supplier payment, cash purchase, rent) have no funding entry behind them. Not a
  dashboard bug; a follow-up could add a capital-injection opening entry to `seed-demo.ts` for
  a more realistic-looking cash position.

### Session 10 — 2026-09-11 (Demo data + User Manuals + System diagnostics)
Not a v1 accounting module — three cross-cutting additions the client asked for directly.

- **Comprehensive demo data** (`prisma/seed-demo.ts`, new `npm run db:seed-demo`): scripted
  against the *running dev server's own API* (not raw Prisma writes) so every record goes
  through the same validation + GL/stock posting a real user triggers. Creates 3 categories,
  6 products (incl. one non-taxable, one Service), 2 customers + 2 suppliers with opening
  balances, then a full Quotation→SalesOrder→Invoice chain, a second credit invoice, a cash
  sale, a non-taxable export sale, a receipt, a credit note (partial return), a
  PurchaseOrder→Invoice chain with excise+custom duty, a supplier payment, a debit note, a
  cash purchase, a manual Journal voucher (rent) + Contra voucher (cash→bank), and an
  Inventory Adjustment (damage write-off) — spread across dates in FY 2083-84 for realistic
  Aging buckets. Idempotent (checks by name/SKU before creating). Verified: Trial Balance and
  Balance Sheet both tie exactly on the resulting dataset; Reports/Dashboard/Aging all show
  non-trivial numbers out of the box.
  **Note:** a full `prisma migrate reset` to clear earlier ad-hoc curl test data was blocked
  by the auto-mode safety classifier (destructive DB op) — left in place rather than working
  around it, so a few session-8/9 test records ("Reports Test Customer" etc.) coexist
  alongside the new curated dataset. Cosmetic only, not a functional issue.
- **User Manuals** (`dashboard/help/*`, permission group `help`, module `help.user_manuals`,
  granted to every role including Cashier): seven topic pages — Getting Started, Accounts &
  GL, Sales, Purchase, Inventory, Reports, Roles & Permissions. Shared components in
  `src/components/manual.tsx`: `FlowSteps` (CSS box-and-arrow workflow diagram),
  `TAccountDiagram` (inline SVG Dr/Cr T-account), `ExampleBox`/`TipBox`/`WarnBox`/
  `KeyConcepts`. Each page has a worked numeric example tying back to the real calc engines
  (e.g. the Sales page's example matches `calcSalesTotals`'s actual VAT math). New "Help" nav
  item (`book-open` icon) between Settings and System.
- **System diagnostics** (`dashboard/system/*`, permission group `system`, modules
  `system.system_info` + `system.database_console` — **Administrator only**, deliberately not
  granted to Cashier):
  - **System Info** (`src/server/system/service.ts` → `getSystemInfo()`): app/Next/React/
    Prisma versions, process memory + uptime, host CPU/memory/network interfaces, DB
    round-trip latency (3-ping avg), DB size + Postgres version, and a per-module record-count
    table (Users, Products, Vouchers, Sales/Purchase Docs, Audit Log, …).
  - **Database Console** (`runDiagnosticQuery()` + `/api/system/query`): a genuinely
    read-only SQL tool, not a raw `$queryRawUnsafe` passthrough. Defense in depth: (1) must
    start with SELECT/WITH, no semicolons — blocks stacked statements; (2) keyword blocklist
    (insert/update/delete/drop/alter/truncate/grant/execute/…) as whole words; (3) **the real
    backstop** — the query is wrapped as `SELECT * FROM (<query>) AS _diag LIMIT 200`, and
    Postgres simply cannot parse a non-SELECT statement inside a FROM-subquery, so anything
    that slipped past 1-2 still fails; (4) runs inside a transaction with
    `SET TRANSACTION READ ONLY` + a 3s `statement_timeout`; (5) every query is written to
    `AuditLog`. Verified via curl: `DROP TABLE`, a stacked `SELECT 1; DROP TABLE`, and an
    `UPDATE` are all rejected before reaching Postgres; a real `SELECT count(*)` succeeds.
    UI ships 5 canned example queries so non-technical admins aren't stuck facing a blank
    textarea. RBAC verified both ways: Cashier's `/api/menu` omits "System" entirely, and a
    direct `curl` to `/api/system/info` as Cashier still gets a real 403 — the menu hide is a
    convenience, not the security boundary.
- Seed changes: added `help`/`system` permission groups + `MenuItem` entries to
  `prisma/seed.ts` (idempotent upserts — safe to re-run); 76 → 79 permission modules.
- tsc + eslint + build + 18/18 existing tests green; all new pages manually verified in the
  browser (flow diagrams, T-account SVG, System Info live data, Database Console guard
  rejections, Cashier RBAC on both the new sections).

### Session 9 — 2026-09-11 (Module 6 — Reports)
- **`src/server/reports/service.ts`** (new) — six report functions, all read-only, all sourced
  directly from `VoucherLine`/`SalesDoc`/`PurchaseDoc` (no new tables, no duplicated totals):
  - `profitAndLoss(from, to)` — Income (credit-natural) vs Expense (debit-natural), grouped by
    account head, from ledgers whose `accountHead.accountType` is IN/EX.
  - `balanceSheet(asOf)` — reuses `trialBalance()`, splits AS vs LI/EQ, adds a "Current Year
    Profit" line under Equity from `profitAndLoss({ to: asOf })`. **Ties to the paisa** by
    construction: `postVoucher`'s Σdebit=Σcredit invariant guarantees Assets = Liabilities +
    Equity + NetProfit for any point in time, no plug entry needed.
  - `dayBook(date)` — every voucher posted that day, full line detail, running Dr/Cr totals.
  - `vatReturn(from, to)` — Output VAT (`ONFC-C-07-0001` movement) vs Input VAT
    (`ONFA-C-06-0001` movement), plus taxable/non-taxable Sales-net-of-CreditNote and
    Purchase-net-of-DebitNote breakdowns from the doc tables.
  - `receivablesAging(asOf)` / `payablesAging(asOf)` — 0-30/31-60/61-90/90+ buckets on
    outstanding Sales/Purchase Invoices. **Important wrinkle found while building this:**
    `SalesDoc.amountPaid`/`grandTotal` are NOT touched by a Credit Note (only `status`
    changes) — same for `PurchaseDoc` + Debit Note. So outstanding had to be computed as
    `grandTotal − amountPaid − Σ(credit/debit notes against this doc)`, not the naive
    `grandTotal − amountPaid` used elsewhere for display. No existing code changed; this is
    purely how the new report reads the same data.
- API: `/api/reports/{profit-loss,balance-sheet,day-book,vat-return,aging/receivable,aging/payable}`.
- UI: added `dashboard/reports/layout.tsx` (TabNav across all 9 reports — was missing before,
  each report page had no shared shell). Six new pages + a **Ledger Report page** (the API
  already existed from session 5 but had no UI — gap closed here) using `LedgerPicker`.
  New shared `components/aging-view.tsx` parameterized for Receivable vs Payable.
- **Verified with a full transaction cycle** created via curl on a fresh dev DB (credit sale +
  cash sale + receipt + credit note + credit purchase w/ excise+custom duty + payment + debit
  note): Balance Sheet ties (Assets 4181.20 = Liabilities+Equity 4181.20 exactly), VAT Return
  math hand-verified (output 390.00, input 193.70, payable 196.30), both Aging reports match
  the ledger statement's closing balance exactly (1260.00 / 783.70), Day Book shows the
  correct Dr/Cr breakdown for a cash sale. tsc + eslint + build + 18/18 existing tests green.
  (Hit one ESLint `set-state-in-effect` error pattern across all 6 new client views — same
  fix as session 7: wrap the fetch + setState calls in a `setTimeout(…, 0)` with cleanup.)
- **Gaps:** no PDF/Excel export (print-only, same as Trial Balance); VAT Return doesn't yet
  map to the IRD Annex 5/13 formats (those need the CBMS integration pass); no Vitest for the
  aging bucket math (verified manually — it's simple date arithmetic, low risk).

### Session 8 — 2026-09-11 (Module 5 — Purchase)
- Schema: `PurchaseDoc` (PURCHASE_ORDER/INVOICE/DEBIT_NOTE) + `PurchaseDocItem` + `SupplierPayment`.
  Mirrors `SalesDoc`, roles reversed (we're the buyer). Migration `purchase`.
- **`src/server/purchase/calc.ts`** — totals engine, **8 Vitest tests**. Key difference from
  Sales: excise + custom duty are **capitalized into landed cost** (added to the taxable base
  before VAT), not expensed — standard perpetual-inventory treatment. Exposes both
  `landedAmount` (pre-discount, display) and **`capitalizedAmount`** (post-discount — the
  value that must drive every GL/stock posting).
- **`src/server/purchase/service.ts`**:
  - `createPurchaseInvoice` — one tx: stock IN (goods, valued at landed unit cost incl. duty)
    → `postVoucher(PURCHASE)` Dr Inventory (goods) + Dr Purchase Expense (non-goods) +
    Dr Input VAT Receivable / Cr Supplier → paid-immediately also books a Supplier Payment.
    Gap-free `PU-2083/84-0001`. **Immutable** — no update/delete route (405).
  - `createSupplierPayment` — Dr Supplier / Cr Cash-Bank; updates invoice status; rejects
    over-payment.
  - `createDebitNote` — purchase return: stock OUT + reverse GL, capped at invoice remainder.
  - `createPurchaseOrder` / `convertPurchaseOrder` — draft, no GL/stock, converts to invoice.
- **Two real bugs found and fixed by `postVoucher`'s Σdebit=Σcredit guard** (transaction
  rolled back cleanly both times, no data corruption):
  1. Service layer summed the item's **pre-discount** `landedAmount` to build the Inventory
     debit instead of the post-discount `capitalizedAmount` → voucher out of balance by
     exactly the header-discount amount. Fixed by adding `capitalizedAmount` to the calc
     result and using it everywhere GL/stock amounts are built. Added a regression test.
  2. `createDebitNote` valued the returned stock at the product's **current weighted-average
     cost** (which drifts with unrelated purchases) instead of the debit note's own
     `landedUnitCost` — same class of imbalance. A debit note must reverse exactly what its
     own lines say (mirrors the original invoice, Dr/Cr swapped), not a re-derived average.
- API: `/api/purchase/{calc,orders,invoices[/id],payments,debit-notes,docs/[id]/convert}`.
  UI: Purchase section (TabNav: Purchase Order/Invoice/Payments/Debit Notes) with
  `PurchaseLineEditor` (adds Excise/Custom columns to the Sales line-grid pattern).
- **Verified (curl):** credit purchase (100 @ 100, excise 200, custom 300, discount 500) →
  Dr Inventory 10000 / Dr VAT Receivable 1300 / Cr Supplier 11300, trial balance ties; second
  purchase blends weighted-avg cost correctly (100@100 + 50@140 → avg 113.33); cash purchase
  auto-pays; supplier payment reduces outstanding + flips status; debit note (return 10 units)
  reverses GL/stock correctly and invoice → RETURNED; over-limit debit note rejected;
  PATCH/DELETE → 405. tsc + eslint + build + **18/18 tests** (10 sales + 8 purchase) green.
- **Gaps:** Goods Received / Imports / Expenses sub-pages stubbed; purchase detail/print view;
  DB-integration tests for the posting flow (verified manually via curl, same as Sales).

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
  5. **Purchase:** ✅ Purchase Order → Purchase Invoice (excise/custom duty capitalized into
     landed cost, input VAT, immutable) → ✅ Payment → ✅ Debit Note — *done session 8*.
     ⬜ Goods Received / Imports / Expenses.
  6. **Vouchers UI:** Journal / Contra ✅ (session 5) · ⬜ Stock Journal (thin UI over `postVoucher`).
  7. **Reports:** ✅ Trial Balance · ✅ Ledger · ✅ P&L · ✅ Balance Sheet · ✅ Day Book ·
     ✅ Stock Summary · ✅ VAT Return · ✅ Receivable/Payable Aging — *done session 9*.
     ⬜ Annex 5/13 exact IRD formats (needs the CBMS pass) · ⬜ PDF/Excel export.
  8. **Dashboard** widgets — ✅ done session 11 (KPIs, sales trend chart, recent activity,
     fully permission-scoped).
  9. **Verticals:** ✅ Fixed Assets (session 12) → ✅ Manufacturing (session 13) →
     ✅ Workshop (session 14) → ⬜ Restaurant → Fuel/Token → Printing, then **Documents**.
     *CRM, Budget, Store Builder = post-v1.*
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
