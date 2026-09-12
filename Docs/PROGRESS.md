# PROGRESS — session log & roadmap

> **Read this first.** Hand-off document between working sessions. Update at end of every session.

## Current status: `PHASE 3 — FOUNDATION (done)` → next: PHASE 1 deep discovery + PHASE 5 modules

Order (from brief): INSPECT → ARCHITECTURE → FOUNDATION → CORE UI → MODULES →
CROSS-MODULE WORKFLOWS → ENTERPRISE HARDENING → QA.

Project now lives at **`D:\Bela_ABMS\`** (renamed from the `&`-containing path). App in `app/`.

---

## Session log

### Session 27 — 2026-09-12 (Receipt printing template — a document type that had none)
Direct follow-on: "add a receipt printing template too." Unlike Sales/Purchase Invoice,
Receipts had **no detail page or print capability at all** before this session — list rows
weren't even clickable, just a plain create-modal workflow. Closed exactly the scope gap
sessions 25/26 explicitly flagged as out of scope ("the reference also has separate galleries
per document type — e.g. Receipt").

Added `getReceipt(companyId, id)` (`src/server/sales/service.ts`, joins the customer/payment
ledger names and the against-invoice number that `Receipt`'s three FK columns point at) and a
new `/dashboard/sales/receipt/[id]` detail page — the first thing a user can navigate to from
a Receipts list row, which now has a `cursor-pointer`/`onClick` like every other document list
in the app instead of being inert.

**Deliberately a separate, leaner architecture from the invoice templates, not shoehorned
into `InvoiceTemplateData`.** A payment receipt has no line-item table, tax breakdown, or
HS-code column — reusing the invoice shape would mean a dozen unused fields on every receipt.
`ReceiptTemplateData` (`src/components/receipt-templates/types.ts`) is its own type, importing
only `TemplateCompany` from `invoice-templates` rather than duplicating it. Shipped one
template, **Classic**: the same letterhead pattern as the Classic invoice template (so every
document this company prints shares a visual identity), a boxed "Amount Received" callout,
`amountInWords()` reused from session 25, and a Payment mode / Deposited to / Against /
Reference detail grid. Uses the same `RECEIPT_TEMPLATE_OPTIONS` + `<ReceiptTemplateRenderer>`
dispatch shape as the invoice gallery (currently a single entry, `default` case), so a second
receipt template later is exactly as additive as session 26's three were — but no Settings-
page selector was built yet, since a picker with one option is exactly the kind of feature the
project's own convention says not to build ("don't add validation/features for scenarios that
can't happen") until a second template actually exists.

Verified live: created a real receipt earlier in the project's history, clicked its row from
the Receipts list for the first time ever, confirmed the detail page renders with correct
company letterhead, party name, amount, amount-in-words, and against-invoice reference, and
confirmed the Print button (the same shared `<PrintButton>` every other document uses) is
present and wired. `npm run typecheck`, `npx eslint src` (clean on the first pass), and a
clean `rm -rf .next && npm run build` all pass, including the new `[id]` dynamic route.

### Session 26 — 2026-09-12 (3 more Printing Templates — manufacturing/construction themed)
Direct follow-on to session 25: client asked for "more modern predesigned templates for a
manufacturing and construction company". The architecture built in session 25 made this a
clean additive change — no schema migration, no Settings-page changes, no API-route changes,
no changes to either invoice detail view. Just: append 3 entries to `TEMPLATE_OPTIONS`, add 3
new self-contained components, add 3 `case`s to `<InvoiceTemplateRenderer>`'s switch, and
widen the `template` Zod enum in `src/server/settings/schemas.ts`. Confirms the session-25
design goal held up on first real reuse.

**Industrial** — charcoal (`#1f2328`) and safety-yellow (`#f5c518`) hazard-stripe header
(a repeating 45° CSS gradient, the classic yellow/black tape pattern), a "Site / Job Notes"
callout box for the invoice's free-text notes, "Received by (site)" on the signature line
instead of a generic "Prepared by" — built for a factory floor or site office rather than a
retail counter.

**Blueprint** — pale engineering-grid-paper background (a two-axis CSS `linear-gradient`
grid, 16px cells), small L-shaped corner registration marks on the header and totals boxes
(mimicking a drawing sheet's crop marks), monospace ink-blue typography throughout, "DWG NO"
in place of "Invoice No", "PO / Contract No." in place of the generic reference label, and a
dimension-style bordered totals box — for a construction or engineering shop whose own
drawings already use this register.

**Structural** — deliberately the most restrained of the three: pure black/white/grey, no
accent colour at all, a solid black header band and a matching black "TOTAL" band, boxed
"Site Supervisor" and signatory blocks styled like an architectural title block. The
counterpoint to Industrial's high-contrast yellow — for a client who wants "professional
and minimal," not "loud."

All three relabel `referenceNo` as "PO / Ref" or "PO / Contract No." (a real construction-
industry convention — a PO or contract number is usually the primary cross-reference on this
kind of invoice) without any backend change; the field itself was already generic.

Verified live: all 8 templates (5 from session 25 + 3 new) render correctly in the Settings
gallery against real company data; previewed each of the 3 new ones full-size in the modal;
selected Industrial and confirmed a real Sales Invoice detail page switched to it correctly
with real data; reset to Classic as the shipped default afterward. `npm run typecheck`,
`npx eslint src` (clean on the first pass), and a clean `rm -rf .next && npm run build` all
pass.

### Session 25 — 2026-09-12 (Printing Templates — 5 professionally designed invoice layouts)
Client asked to clone the reference app's Settings › Printing Templates
(`bela.nepalebilling.com/dashboard/settings/printing-templates`), explicitly framing the ask
as design work ("act like a professional modern graphics designer and developer"), and
offered to log into the reference app manually if needed. Browsed the live reference page
directly (session already had an authenticated tab open) — it offers ~40 template variants
per document type (A4 portrait/landscape, A5, 80mm/50mm thermal, POS, dual-copy, cargo/
export with weight columns, boxed bill-book digit fields, colorful per-tenant branding). This
was genuinely undiscovered territory: `Docs/DISCOVERY-LOG.md` had "Printing templates" on its
own "not yet inspected" list, and — unlike session 24's 12 items — it had no seeded
permission/menu entry in `prisma/seed.ts` at all; this feature didn't exist in this project's
data model in any form before this session.

**Deliberately built 5 distinct, professional templates instead of cloning the full ~40** —
the reference's own catalogue is mostly minor layout variations on the same handful of ideas,
and the client's framing asked for design judgment, not a literal 1:1 copy. Same
"reinterpret rather than copy wholesale" principle as Budget (session 21): **Classic** (the
app's pre-existing invoice layout, now one option among several), **Modern** (a genuinely
new design — navy/orange brand-gradient header using Bela's actual brand colors from
`globals.css`, tinted party-info box, shaded table header, a bold "GRAND TOTAL" callout
band), **Compact** (dense A5 half-page layout), **Thermal Receipt** (narrow 80mm POS-style,
dashed separators, monospace, centered), **Dual Copy** (Original + Customer Copy stacked on
one A4 sheet with a scissor cut-line — the common Nepali carbon-copy filing practice
observed directly in the reference gallery).

**Architecture:** `InvoiceSetting` gained a `template` field (plain string, not an enum, so a
6th template ships without a migration) and all 5 layouts live in
`src/components/invoice-templates/` as self-contained components sharing one
`InvoiceTemplateData` type — a superset covering both Sales and Purchase Invoice
(`partyLabel`/`partyName` generic instead of hardcoding "customer" vs "supplier"), dispatched
by `<InvoiceTemplateRenderer template=…>`. Both invoice detail-view components now map their
own `doc` shape into this common type instead of rendering fixed JSX directly — Purchase's
mapping explicitly hardcodes `showBankDetails`/`showQrCode` to `false` regardless of the real
setting, carrying forward the pre-existing "Purchase never prints the company's own bank
details" rule across every template rather than just the one layout that rule used to live
in exclusively.

**New, standard-but-previously-missing feature:** `src/lib/number-to-words.ts`
(`amountInWords()`) — Indian/Nepali lakh/crore-grouped amount-in-words (e.g. "Rupees Twelve
Lakh Thirty Four Thousand Five Hundred Sixty Seven and Fifty Paisa Only"), a standard line on
every Nepali tax invoice that this app's print output never had. Verified against a battery
of edge cases (zero, exact lakh/crore boundaries, teens/twenties, max value) by direct script
execution before wiring it in. Every one of the 5 templates includes it.

**Bug caught during live verification, not before:** the Settings gallery's sample invoice
data used comma-formatted amounts for display ("12,260.50"); `amountInWords()` naively called
`Number()` on that string, which parses to `NaN` → silently rendered "Rupees Zero Only" in
the Modern template's live preview. Fixed by stripping thousand-separator commas before
parsing. This would not have been caught by typecheck or lint — only live rendering exposed
it, reconfirming the project's own "verify in the browser, not just the type checker"
convention.

The Settings page itself (new `settings.printing_templates` permission — added to
`prisma/seed.ts`'s catalogue and menu tree, then the seed re-run idempotently against the
existing dev DB) renders all 5 templates live at reduced scale against one shared realistic
sample invoice (not static screenshots), so the gallery can never drift out of sync with what
actually prints; a "Preview" button opens the same live render full-size in a modal.
Selecting a template PUTs `/api/settings/printing-template` and applies immediately
company-wide, matching the reference app's own instant-apply behavior.

Verified live end-to-end: viewed the gallery with all 5 templates rendering correctly against
real company data; selected Modern and confirmed a real Sales Invoice detail page switched to
it immediately, including the correct amount-in-words and bank-details block; opened a real
Purchase Invoice under the same Modern selection and confirmed it correctly renders as
"PURCHASE INVOICE" / "SUPPLIER" / "Landed Amount" with bank details still suppressed;
selected Thermal Receipt and confirmed a real invoice renders as a convincing narrow POS
receipt; reset to Classic as the sensible shipped default. `npm run typecheck`, `npx eslint
src` (clean on the first pass), and a clean `rm -rf .next && npm run build` all pass.

Scoped to Sales + Purchase Invoice only — the reference app's own gallery has separate
template sets per document type (e.g. Receipt has its own, much shorter list), which is out
of scope for this pass.

### Session 24 — 2026-09-12 (Full menu audit + 12 stub menu items built)
Client asked point-blank: "do all menu and sub menu is implemented all features?" Rather than
answer from the session-by-session narrative in `Docs/PROGRESS.md`/memory (which only tracks
what was *deliberately worked on*), ran a full agent audit of every seeded menu/submenu item
against actual `page.tsx` files. Finding: **the narrative was significantly wrong** — 24
submenu items across 8 areas were stubs (fall through to `[...slug]`'s "Module not yet
implemented"), not the 1-2 the running gap-list implied. `prisma/seed.ts` seeds a real route
+ permission key for every item the reference app's sidebar shows, independent of whether it
was ever built — the same pattern session 20 found once with the Budget nav item, just far
more widespread than any prior session had checked for.

The 24 stubs: five entire unbuilt modules (**CRM**, **Store Builder**, **Token**,
**Documents** — reference-app features with no obvious fit for a manufacturing company,
never built at all) plus **Printing Cost Register** (Sales) — the reference backend's own
model inventory flags this as a print-shop industry vertical ("likely trigger: print shops"),
same non-fit reasoning — and 12 "scattered stub" items inside otherwise-complete modules.
Client said skip the five whole-module/vertical items, build the 12 scattered ones.

**None of the 12 have any documented spec.** `Docs/DISCOVERY-LOG.md` itself lists them
"not yet inspected"; `Docs/ASSUMPTIONS.md` already flags this exact class of problem (A13:
"which [reference-backend features] are in scope, and in what order?") without resolving it
for these specifically. Per the client's explicit instruction, built all 12 using standard
accounting/Nepali-business-practice interpretations rather than guessing silently or blocking
on a discovery pass this session has no reference-app credentials to run — every judgment
call is flagged in a `schema.prisma` comment and in `Docs/DATABASE.md`, not presented as a
verified clone. Two were reused, not new: **Proforma Invoice** just adds
`PROFORMA_INVOICE` to the existing `SalesDocType` enum (same non-posting draft pattern as
Quotation, reusing `createDraft`/`convertDoc`/`<DraftWorkspace>` end to end — `PF-` prefix);
**Expenses** wires up `VoucherType.EXPENSE`, which had existed in the schema and the
voucher-number-prefix map since the platform foundation but had never actually been posted
anywhere — reuses `createVoucher()`/`<VoucherWorkspace>` verbatim, the same component
Journal/Contra Voucher already use. **Receivable Amount**/**Payable Amount** (flat,
actionable per-invoice lists) and **Cash & Bank Account** (live per-ledger balances filtered
to the "CCE" account head) are read-only views with no new model, built by reusing
`receivablesAging()`/`payablesAging()`'s underlying query and `trialBalance()`'s existing
per-ledger computation respectively, rather than recomputing anything from scratch.

Six new models for the rest, each deliberately scoped to avoid double-counting what an
existing document already posts: **`Chalani`**/`ChalaniItem` (Sales — a dispatch/delivery
register, paperwork only, since the Sales Invoice already owns GL+stock); **`Cheque`**
(Sales — post-dated cheque clearance tracking; `PaymentMode.CHEQUE` already existed for the
GL side, this is the physical-instrument register, not a second posting); **`GoodsReceipt`**/
`GoodsReceiptItem` (Purchase — ordered-vs-received reconciliation before the supplier's
invoice arrives, no stock/GL, since `createPurchaseInvoice()` still owns both);
**`ImportShipment`** (Purchase — customs/compliance register alongside a Purchase Invoice's
own excise/custom duty fields, no GL); **`WarehouseTransfer`**/`WarehouseTransferItem`
(Inventory — the one that actually moves real stock: a genuine `TRANSFER_OUT`+`TRANSFER_IN`
`StockMovement` pair per line via the existing `postStockMovement()`, no GL/unit-cost,
matching `InventoryAdjustment`'s own precedent that a transfer changes location, never
value); **`BalanceConfirmation`** (Accounts — a frozen point-in-time balance snapshot for
customer/supplier reconciliation, computed live from `trialBalance({asOf})` at creation,
never repostable since it's a statement about a balance, not a transaction).

**Key design point — Inventory Transfer was reinterpreted, not built as named.** Nothing
distinguishes "Warehouse Transfer" from "Inventory Transfer" as two menu items anywhere in
this project's docs, and this app's own list+create-modal convention means a second
transfer-creation screen would just duplicate Warehouse Transfer's own history list.
Reinterpreted it as `stockMovementLedger()` — a read-only, filterable view of *every*
`StockMovement` row across every kind (purchase/sale/adjustment/transfer/manufacture), a
system-wide movement ledger that genuinely didn't exist anywhere before, rather than a
redundant second transfer form.

Verified live for all 12, not just typecheck: created a real record through every new
form, confirmed each one's number-prefix sequence (`PF-`, `CH-`, `EX-`, `GRN-`, `IMP-`,
`WT-`), confirmed the Expenses voucher actually posts a balanced GL entry, confirmed the
Warehouse Transfer posts a real paired stock movement that shows up correctly in Inventory
Transfer's ledger with its filters working, confirmed Cheque and Balance Confirmation's
inline status dropdowns persist via PATCH, and confirmed Receivable/Payable Amount's search
and totals match the underlying invoice data. `npm run typecheck`, `npx eslint src` (clean
on the first pass — no fixes needed), and a clean `rm -rf .next && npm run build` all pass.

**Menu completeness after this session** (correcting an arithmetic slip in the audit's own
summary count — the itemized stub list actually totals 24, not the "19" the audit's summary
line stated; always recount from the itemized list, not a summary tally, before quoting a
number): all 12 client-approved items are now built. What's left, all by explicit client
decision this session to skip: **CRM** (5 items — Dashboard, Clients, Partners, Follow Ups,
Reports), **Store Builder** (4 — Theme Settings, Hero Sliders, Offer Ads, Reviews),
**Token**, **Documents**, and **Printing Cost Register** (a print-shop industry-vertical
feature with no fit here) — 12 items across 5 areas, all reference-app features with no
established fit for a manufacturing/building-materials company, same reasoning as Budget's
session-20 reinterpretation. Plus two still-open partial gaps found in the same audit:
Invoice Import Setting's CSV upload/parse pipeline (session 19 — mapping-only) and Backup
Data's restore/import path (export-only; not previously tracked in this log).

### Session 23 — 2026-09-12 (EAN13 barcode rendering — closing the second-to-last gap)
Continued from an open-ended "continue" with no specific list, same pattern as session 20 —
worked through the two remaining documented gaps by value, starting with the more
self-contained one. EAN13 (`BarcodeSetting.symbology`'s other option, session 19) previously
had no encoder at all: the label page showed an honest on-screen warning and rendered
Code128 regardless of the setting. No schema change was needed — `symbology`/`prefix`/
`nextNumber` already existed on `BarcodeSetting`; this was purely an encoder + generation-
logic gap.

**`src/lib/barcode.ts`** gained `encodeEAN13()` (standard GS1 L/G/R 7-module tables per
digit + guard bars, concatenated into one 95-module bit string and run-length encoded the
same way Code128's pattern table already was) and `ean13CheckDigit()` (mod-10 weighted-3/1
check digit). Verified correct with a 2000-iteration round-trip fuzz test (encode every
first-digit/parity combination across random bodies, decode back via inverse tables, confirm
the digits match) plus the well-known real-world example `4006381333931`, which round-trips
and check-digit-validates correctly — high confidence the tables weren't mistyped.
`<BarcodeSvg symbology>` now picks the encoder; the sole caller
(`barcode-label-view.tsx`) passes the setting's actual symbology through.

**Key design point — reconciling free-text `prefix` with EAN13's numeric-only format.**
`generateProductBarcode()` (`src/server/inventory/service.ts`) previously built
`prefix + 6-digit counter` as an arbitrary alphanumeric string — fine for Code128, invalid
for EAN13 (needs exactly 13 numeric digits). Rather than forcing the admin to reconfigure
their prefix, the EAN13 branch keeps only the prefix's digit characters (zero-padded/
truncated to 6), fills the remaining 6 with the counter, and appends a real computed check
digit — same "prefix + counter" shape the setting already implies, now guaranteed valid.

**Second design point — a value survives a symbology switch, but can't be re-decoded under
the new one.** `Product.barcodeValue` has no companion field recording which symbology
generated it, and generation is a one-time claim (no regenerate-on-demand). Switching the
setting from CODE128 to EAN13 after values already exist means those values are no longer
13 numeric digits — encoding them as EAN13 would throw. Rather than crash the label page,
it now detects the mismatch (`!/^\d{13}$/.test(value)` while `symbology === "EAN13"`) and
shows an explicit message naming the stored value and telling the admin to switch back,
instead of silently mis-rendering or crashing.

Also fixed two pieces of stale copy while touching this exact feature: the Custom Fields
settings page still said "entry forms don't yet render these dynamically" (false since
session 22), and the Barcode settings page still said "label printing UI is a follow-on"
(false since session 20 built it).

Verified live: switched Settings › Barcode to EAN13, generated a fresh barcode for a product
with no prior value (prefix "BELA" has no digits, so the encoder correctly fell back to an
all-zero prefix segment; counter 2 → value `0000000000024`, manually confirmed the check
digit by hand), confirmed the bars render, then opened a product with a pre-existing
Code128 value ("000001") under the EAN13 setting and confirmed the honest mismatch message
appears instead of a crash. Switched back to CODE128 and confirmed the original Code128
label still renders correctly (no regression). `npm run typecheck`, `npx eslint src` (one
`react/no-unescaped-entities` fix), and a clean `rm -rf .next && npm run build` all pass.

**Only one documented gap remains**: Invoice Import Setting's CSV upload/parse pipeline
(session 19 — mapping-only, no execution). Scoped but not started this session — it's
materially larger than EAN13 was (new dependency for CSV parsing, a resolution step from
CSV text to real product/customer/tax-rate IDs, and design decisions for fields the mapping
template doesn't cover at all, like payment mode and a purchase invoice's required
supplier — unlike Sales, Purchase has no free-text customer-name fallback).

### Session 22 — 2026-09-12 (Custom Fields — dynamic form wiring)
Client explicitly asked to continue with Custom Fields' dynamic form wiring next — the one
documented gap left over from session 19 (`CustomField` definitions existed but were never
rendered into an entry form or persisted as a value). New `CustomFieldValue` model
(migration `20260912090157_custom_field_values`, applied cleanly with plain `prisma migrate
dev` — a brand-new table, no workaround needed): `companyId`, `customFieldId→CustomField`,
`entityId`, `value` (`String?`), `@@unique([customFieldId, entityId])`.

**Key design point — `entityId` is deliberately not a real FK.** A value has to attach to
whichever table its field's `module` names — `SalesDoc`, `PurchaseDoc`, `Product`,
`Ledger`-as-contact, or `JobCard` — five structurally unrelated tables, so there's no single
column to point a real foreign key at. Accepted the trade-off explicitly (documented in a
schema comment): the app layer scopes every read/write by `module` + `companyId`, and an
orphaned row after its entity is deleted is just invisible metadata, never a
referential-integrity problem for anything else.

Centralized all the logic in `src/server/custom-fields/service.ts`: `prepareCustomFieldValues()`
validates required-ness against active definitions *before* the entity is created inside a
transaction (so a missing-required-field error can't leave a half-created record), and
`saveCustomFieldValues()` persists *after*, once the new `entityId` exists.
`getCustomFieldValuesForEntity()`/`getCustomFieldValuesForEntities()` (singular/batch, the
latter for list pages) merge values back onto reads, and `summarizeCustomFields()` renders a
compact `"Label: Value, Label2: Value2"` string for the two modules (Product, Contact) with
no existing detail page. `GET /api/custom-fields?module=X` — gated only on being signed in
with a company, deliberately *not* on `settings.custom_fields` (that permission governs
managing definitions, not using them while filling out an invoice) — feeds a new
`<CustomFieldsFields>` component that every entry form renders unconditionally; it fetches
its own definitions and returns `null` outright (heading included) when a module has zero
active fields, so no caller needs to special-case the empty state. `<CustomFieldsDisplay>` is
its read-only counterpart.

Wired into all five modules the brief's `MODULES` list already named: **Product** and
**Contact** show values as the compact summarized list column (no detail page exists for
either); **Job Card** shows them in its existing detail modal; **Sales Invoice** and
**Purchase Invoice** show them on their existing detail/print pages, with values captured
only at creation — matching the pre-existing immutable-once-posted convention for both
invoice types (no edit/update path was added, since none exists for anything else on those
records either).

Verified live end-to-end for all five, not just typecheck: defined one real field per module
via Settings › Custom Fields (a required TEXT on Sales Invoice, a SELECT with options on
Product, a NUMBER on Contact, a CHECKBOX on Job Card, an optional TEXT on Purchase Invoice),
then created a real record through each entry form. Confirmed the required-field check
actually rejects an empty submission server-side (`422` + `"PO Reference" is required` toast)
before re-filling and saving successfully, and confirmed every value survives a page
reload on its display surface (list column for Product/Contact, detail modal for Job Card,
detail page for both invoice types). `npm run typecheck`, `npx eslint src` (one
`@next/next/no-assign-module-variable` fix — renamed a local `module` variable in the new
route handler, since Next.js reserves that name in its CommonJS module scope), and a clean
`rm -rf .next && npm run build` all pass.

**Every documented gap from session 19/20 is now closed except two**: EAN13 barcode
rendering (session 20 — only Code128 actually renders) and Invoice Import Setting's CSV
upload/parse pipeline (session 19 — mapping-only). Both remain correctly flagged rather than
silently faked.

### Session 21 — 2026-09-12 (Budget module — the last Reports catalogue gap)
Client explicitly asked to continue with the Budget module next. This was the one remaining
gap-card that couldn't be closed by discovering existing-but-unwired plumbing (unlike
Batch/Custom Status/Barcode in session 20) — the reference app's "Budget" group is genuinely
NGO/project-fund accounting (a `budget fund` is a grant donor, per `Docs/DATABASE.md`'s
reference-inventory notes), which doesn't fit Bela's business at all. Reinterpreted rather
than copied: `BudgetFund` here is an **internal** funding source (e.g. "Term Loan — NIC
Bank", "Retained Earnings") for a capex/operating budget, not a donor; there's no `project`
model since project-restricted-fund accounting isn't relevant to a manufacturing company.
Four new models (migration `20260912082437_budget_module`, applied cleanly with plain
`prisma migrate dev` since these are brand-new tables, not new constraints on existing data
— no non-interactive workaround needed this time): `BudgetHeading`, `BudgetFund`, `Budget`,
`BudgetAllocation`.

**Key design point — actual spend is computed, not entered.** A `BudgetHeading` is either
`MANUAL` (free-text, no automatic actual) or `COA_GROUP` (linked to a real `AccountGroup`).
`budgetVsExpenseReport()` in `src/server/budget/service.ts` computes "actual" for a
COA_GROUP heading exactly the way `profitAndLoss()` already does — sums `VoucherLine`
debit−credit across every ledger in that group, scoped to the budget's fiscal year — so
allocating Rs. 300,000 to an "Office Rent Budget" heading linked to the Rent Expenses group
immediately shows the real Rs. 25,000 Journal Voucher posted in an earlier session as actual
spend, 8.3% utilization, with zero extra wiring. A MANUAL heading reports `actual: null`
(not a fabricated zero) since there's genuinely nothing to compute — same "don't fake a
number you can't back up" principle as everywhere else this session.

Built all 4 tabs the sidebar's pre-seeded (previously dead) "Budget" nav item already
pointed at — `/dashboard/budget/{budget-heading,budget,allocation,fund}` — plus
`/dashboard/reports/budget/budget-vs-expense`, now linked live from the Reports catalogue
instead of its gap-card. Allocation is its own tab/permission module (`budget.allocation`,
distinct from `budget.budget`) matching the reference's own module split — a budget's
container (name, fiscal year, fund) and its per-heading amounts are edited in different
places by potentially different roles.

Verified live end-to-end with real data, not fixtures: created a COA-linked "Office Rent
Budget" heading against the real Rent Expenses (ADE-19) account group, a "Retained Earnings"
fund, a "FY 2083-84 Operating Budget" container, allocated Rs. 300,000 to the heading, and
confirmed the Budget vs Expense Report correctly pulled Rs. 25,000 actual from the
pre-existing Journal Voucher with correct variance (275,000) and utilization (8.3%) —
without creating any new GL entries to fake the number. Left this data in place as genuine
starter configuration (same judgment as the Nabil Bank example in session 19), not test
noise to clean up. `npm run typecheck`, `npx eslint src` (one `react-hooks/set-state-in-effect`
fix, same `setTimeout` wrapper pattern as every other report view), and a clean
`rm -rf .next && npm run build` all pass.

**Every documented Reports catalogue gap from session 18 is now closed** (Batch/Expiry in
session 20, Budget vs Expense here) except Annex 13/5, which remains correctly blocked on
the missing official IRD spec. Remaining open items are all from the Settings-sub-page MVP
scoping in session 19: Custom Fields still has no dynamic form wiring, EAN13 barcode
rendering (session 20), Invoice Import Setting's CSV upload/parse execution.

### Session 20 — 2026-09-12 (Batch/expiry tracking + Custom Status wiring + real Barcode rendering)
Client asked to "continue remaining tasks... enterprise level... today's company standards"
with no specific list, so this session worked from the two honestly-flagged gaps left in the
Reports catalogue (session 18): Batch Wise Stock Summary and Expiry Management, both
previously marked "needs a Batch model — not yet in the schema". That turned out to be
**wrong** on closer inspection — `ProductBatch` (with `expiryDate`) has existed since session
6, `StockMovement.batchId` and `SalesDocItem.batchId`/`PurchaseDocItem.batchId` were already
columns, and `postStockMovement()`/`onHandQty()` in `src/server/inventory/stock.ts` already
took an optional `batchId` end-to-end. The gap was real but narrower than stated: nothing
ever *created* a `ProductBatch` row or exposed batch fields in the UI — the plumbing was
provisioned but never wired to a form. Corrected and closed it properly rather than leaving
the gap-card up.

**What was built:**
- `resolveOrCreateBatch()` (find-or-create, unique on companyId+productId+warehouseId+batchNo)
  and `availableBatches()` (FEFO-sorted, stock-on-hand > 0 only) added to
  `src/server/inventory/stock.ts`.
- **Purchase Invoice line editor**: optional "Batch no." + expiry date inputs appear once a
  product is picked. `docLine` schema (`purchase/schemas.ts`) gained `batchNo`/`expiryDate`;
  `createInvoice()` resolves/creates the batch against the line's (or default) warehouse
  *before* the transaction's `items.create`, since Prisma's nested create can't run async
  lookups per row.
- **Sales Invoice line editor**: once a product is picked, `GET /api/inventory/batches`
  fetches its available batches (against the default warehouse) and an optional "Any batch"
  dropdown appears, showing on-hand qty and expiry per lot. `createInvoice()` re-validates
  server-side that the chosen `batchId` actually belongs to that product+warehouse+company
  before trusting it for the stock-out (`resolveLineBatchIds()`), rejecting anything else.
- **Reports**: `batchWiseStockSummary()` (per-lot on-hand) and `expiryManagement()` (batches
  with stock that are expired or within 90 days of expiry, soonest first) — new functions in
  `stock.ts`, new API routes, new report pages. The Reports catalogue's two gap-cards for
  these now link to real pages instead of showing a reason.
- Deliberately did **not** touch costing: batch is recorded as a tag on the `StockMovement`
  row for traceability/expiry reporting only — COGS still reads the existing product-level
  weighted-average cost, unchanged. Also did not touch Credit Note/Debit Note (returns don't
  select a batch to restock into) or add per-line warehouse selection (still resolves to the
  company's one default warehouse everywhere, matching how the rest of the app already
  works) — both noted as intentional scope boundaries, not oversights.

Verified live end-to-end, not just typechecked: created a real Purchase Invoice with batch
"LOT-2026-A" (expiry 2026-12-31) for Steel Bracket, confirmed it appeared in Batch Wise
Stock Summary at the exact quantity purchased; confirmed it correctly did NOT appear in
Expiry Management (>90 days out); created a Sales Invoice, confirmed the batch picker
offered exactly that lot with its live on-hand and expiry; sold part of it and confirmed
Batch Wise Stock Summary's on-hand dropped by exactly the sold quantity. `npm run
typecheck`, `npx eslint src`, and a clean `rm -rf .next && npm run build` all pass.

**Same session, second item — Custom Status wiring.** Session 19 built Custom Status as
definitions-only (a label+color per module, nothing to attach it to). Closed that gap too:
added a nullable `customStatusId` FK to both `SalesDoc` and `PurchaseDoc` (migration
`20260912074027_doc_custom_status_tag`, `onDelete: SetNull`), plus a back-relation on
`CustomStatus`. Unlike every other invoice field this one is genuinely mutable after
creation — it carries no GL/workflow weight, so there's no immutability reason to lock it.
`PATCH /api/sales/invoices/[id]` and `PATCH /api/purchase/invoices/[id]` accept
`{customStatusId}` only (still permission-gated on `update`, still CSRF-checked via
`guard()`) — every other field on those routes stays read-only, enforced by the route
literally not accepting anything else. New shared `src/components/status-tag-picker.tsx`
renders a colored dropdown (editable) or badge (read-only) on both invoice detail pages,
wrapped in `data-app-chrome` so it never shows up on the printed copy — a workflow tag has
no business on what the customer/supplier receives. Verified live: created a "Ready for
Dispatch" SALES_INVOICE status, assigned it to a real invoice, reloaded the page fresh, and
confirmed it persisted.

**Same session, third item — real Barcode rendering.** Settings › Barcode (session 19) was
configuration with nothing reading it. Built an actual Code128B encoder from scratch in
`src/lib/barcode.ts` (~100 lines, the standard ISO/IEC 15417 pattern table, no npm
dependency) — verified the table's structural integrity by checking all 106 data patterns
sum to 11 modules and STOP sums to 13, since there's no physical scanner in this environment
to test against. `Product.barcodeValue` (new nullable column, `@@unique([companyId,
barcodeValue])`, migration `20260912080500_product_barcode_value`) is claimed once via
`generateProductBarcode()` from the setting's `prefix + nextNumber` counter (atomically
incremented, re-calling it on an already-tagged product is a no-op) and rendered as a real
scannable-looking SVG barcode on a new printable label page
(`/dashboard/inventory/products/[id]/barcode`), sized per the setting's label width/height
and honoring its show-name/show-price toggles. The Products list gained a Barcode column
(Goods only) linking straight to it. **Honesty note:** the setting's other symbology option,
EAN13, has no encoder — the label page detects `symbology === "EAN13"` and shows an
on-screen (never printed) warning that it's rendering Code128 instead of silently mislabeling
the output.

Migration note: `prisma migrate dev` refused to run non-interactively for either schema
change this session (it wants an interactive confirmation before adding a `@@unique`
constraint, even one only nullable columns are involved in). Worked around it with
`prisma migrate diff --script` to get the exact SQL, hand-wrote the migration file, and
applied it with `prisma migrate deploy` (non-interactive by design) — same end state as
`migrate dev`, just without the prompt this environment can't answer.

Verified live: generated a barcode for a real product ("A4 Paper Ream" → 000001), saw a
correctly-formed varying-width barcode with the value printed underneath, name and price
shown per settings, and confirmed the value persisted back on the Products list after
navigating away and back.

Still-open documented gaps: Annex 13/5 (no official IRD spec, session 18); Budget module +
Budget vs Expense Report (module doesn't exist, session 19); Custom Fields dynamic wiring
into entry forms (session 19); EAN13 barcode rendering (session 20, flagged on-screen
rather than silently wrong); Invoice Import Setting's CSV upload/parse execution (session
19). These are reasonable candidates for a following session under the same "continue
remaining tasks" instruction.

### Session 19 — 2026-09-12 (The 12 remaining Settings sub-pages)
Closed out the client's oldest still-open ask (first raised in session 17, deferred behind
the letterhead/logo work and then the Reports catalogue): every Settings sub-page beyond
Company Info/Fiscal Year/Tax was still hitting a 404 — `settings/[sub-page]` had no
`page.tsx` and no catch-all inside the `settings/` folder, so the nav links were fully wired
but dead. Built all 12: Signin & Security, User & Permissions, Custom Fields, Custom Status,
Banks, Bank Detail, Bill Footer, Barcode, Invoice Setting, Invoice Import Setting, Backup
Data, Tour. Also fixed a real bug found while doing this: `settings/layout.tsx`'s tab list
was missing "Tour" even though the menu seed already had a route+permission for it.

**Schema** (migration `20260912052338_settings_submodules`): 8 new models — `Bank`,
`BankAccount`, `CustomField`, `CustomStatus`, `BarcodeSetting`, `InvoiceSetting`,
`InvoiceImportTemplate`, `BillFooterSetting`. User & Permissions needed **zero new
models** — `Role`/`PermissionModule`/`RolePermission`/`UserRole`/`UserCompany`/`Branch`
already existed from the platform foundation (session 3); only the CRUD UI was missing.
Full detail in `Docs/DATABASE.md`'s new "Settings sub-modules" section.

**User & Permissions** is the highest-value piece: a real 3-tab page (Users / Roles &
Permissions / Companies) with a full permission-matrix editor — per-module
Create/Read/Update/Delete checkboxes grouped exactly like the app's own navigation, "Grant
all"/"Clear" per group, gated by the finer-grained `settings.roles_and_permissions` key
(distinct from `settings.users`) so a report-only auditor role doesn't need role-editing
rights just to see the Users tab. Added two safety checks that don't exist in the reference
app but felt necessary for a real accounting system: a user can't disable their own account,
and the last active ADMIN-type user can't be disabled by anyone.

**Real wiring, not just stored-and-ignored settings** — the two riskiest-to-get-wrong pieces:
- `InvoiceSetting` (show HS Code / Discount column / bank details / QR) and
  `BillFooterSetting` (terms, bank account, signatory, footer note) are read live by
  `sales/invoice/[id]/page.tsx` and `purchase/purchase-bills/[id]/page.tsx` — toggling a
  setting changes what prints immediately, verified by flipping "Show HS Code" off and
  confirming the column actually disappeared from a real invoice, then flipping it back.
  Purchase invoices never print the company's own bank details (payable, not receivable)
  even though the underlying setting is shared with Sales.
- Added `src/components/print-bill-footer.tsx` as the shared renderer both invoice detail
  pages now use, replacing the static "Prepared by / Authorized signature" placeholder from
  session 17 with the real configured terms/bank/signatory/note.

**Deliberately MVP-scoped, and said so in the UI itself** (same judgment call as the Reports
session's gap-cards, applied inline this time since these aren't missing — they're partial):
Custom Fields and Custom Status are definitions-only (no dynamic form rendering yet — wiring
that into every entry form across the app is a much larger project, and `SalesDoc`/
`PurchaseDoc.status` deliberately stays on its fixed enum since GL posting logic depends on
specific values); Barcode is configuration-only (no symbol renderer); Invoice Import Setting
is the column-mapping template only (no CSV upload/parse pipeline).

**Signin & Security** does password change (self-service — no permission-module gate, since
every authenticated user must be able to change their own password regardless of role, same
as logout) and lists/revokes active sessions from `RefreshToken`. Found the CSRF gap while
building it: `guard()` requires a permission key, but this route legitimately has none, so
exported `assertCsrf()` from `src/lib/guard.ts` for routes that need the CSRF check without
a permission check.

**Backup Data** streams a real JSON export (fiscal years, chart of accounts, vouchers,
products, sales/purchase docs, etc.) via `Content-Disposition: attachment` — no restore path
yet, explicitly labeled as an offline archive.

Verified everything live rather than trusting typecheck: created a real Bank → Bank Account →
Bill Footer chain end-to-end and confirmed it printed correctly on an actual Sales Invoice
(bank name/account/branch, terms, signatory, thank-you note all appeared exactly where
configured); created a new "Auditor" role via the matrix editor with a full group grant and
confirmed it appeared as an assignable role on the Add User form (proving the
Role→RolePermission→UserRole chain works end-to-end); toggled Invoice Setting's HS Code
column off and back on against a live invoice. Cleaned up the two pure-test artifacts
(the Auditor role, a test import template) afterward via direct authenticated `fetch()`
calls, since the delete buttons' native `confirm()` dialogs can't be driven by browser
automation — everything real (Nabil Bank, its account, the Bill Footer text) was left in
place as genuine starter configuration. `npm run typecheck`, `npx eslint src`, and a clean
`rm -rf .next && npm run build` all pass.

**Nothing client-requested remains outstanding** as of this session — Vouchers UI (17),
printed letterhead (17), Reports catalogue (18), and now all Settings sub-pages (19) close
out every explicit ask made since session 16's Enterprise Hardening pass. Documented gaps
(Batch/Expiry reports, Annex 13/5, Budget module, dynamic Custom Fields/Status, barcode
rendering, CSV import execution) are flagged in-product, not silently missing.

### Session 18 — 2026-09-11 (Reports catalogue — cloned from the reference app)
Client shared `user_manuals/Key Features.docx` (the vendor's original marketing sheet —
"Zoom in (Drill Down) from almost all Reports to Source Voucher" is literally in it) and
pointed at `https://bela.nepalebilling.com/dashboard/reports`, asking to clone that
reports page and its functions. `/dashboard/reports` itself had no `page.tsx` — only a
`layout.tsx` with a flat 9-tab bar — so the Reports item in the sidebar 404'd; the
reference catalogue (documented in `Docs/DISCOVERY-LOG.md` session 5, ~20 reports across
8 permission-scoped groups: Accounting/Sales/Purchase/Payable & Receivable/Inventory/
System/Tax/Budget) had never actually been built.

**Built:**
- **Reports catalogue** (`src/app/(app)/dashboard/reports/page.tsx`,
  `src/components/reports-catalogue.tsx`) — grouped cards matching the reference
  structure 1:1, permission-filtered per group (`reports.<x>_reports`), with a
  localStorage-backed **Favourites** star (matches the reference's own "Favourites"
  pinning). Replaced the old flat `TabNav` in `reports/layout.tsx` — with ~20 reports a
  tab bar stopped scaling — with a simple "← All Reports" back-link.
- **9 new reports**, all in `src/server/reports/service.ts` (same file/pattern as the
  existing P&L/Balance Sheet/Day Book/VAT Return/Aging functions):
  - **Transaction List** — every posted `VoucherLine` in a date range, ledger-filterable,
    paginated. The most granular report; literally implements the brief's "drill down to
    source voucher" feature.
  - **General Ledger Summary** — per-ledger opening/debit/credit/closing for a date
    *range*, distinct from Trial Balance (always cumulative "as of" one date).
  - **Journal Report / Contra Report** — read-only report view of posted vouchers,
    gated by `reports.accounting_reports` rather than the Vouchers module, so an
    auditor-type role can see them without voucher-entry rights. Click a row to expand
    its ledger lines inline (no new route needed for drill-down).
  - **Sales Report / Purchase Report** — date-ranged, include PAN + VAT columns so the
    same route also serves as the reference's separate "(Tax)" variant (catalogue links
    both names to the same page rather than building pixel-duplicate screens — see
    PROGRESS note below on this judgment call). Rows click through to the Sales/Purchase
    Invoice detail+print pages built in session 17.
  - **Sales Return Report / Purchase Return Report** — Credit Notes / Debit Notes,
    date range.
  - **Sales Profit Report** — per-invoice gross profit; reads back the COGS voucher
    `postVoucher()` already wrote at sale time (`SalesDoc.cogsVoucherId`) rather than
    recomputing cost — zero new cost logic.
  - **Receipt Report / Payment Report** — Receipts / Supplier Payments, date range.
  - **Monthly Tax Summary** — output/input VAT bucketed by calendar month (same inputs
    as the existing `vatReturn()`, grouped differently).
  - **Activity Log** — `AuditLog` viewer, date range + pagination (System Reports group).
- Shared client components to avoid duplicating each report's date-range/table
  boilerplate: `voucher-report-view.tsx`, `doc-report-view.tsx`,
  `payments-report-view.tsx`, plus one-off views for Transaction List, General Ledger
  Summary, Sales Profit, Monthly Tax Summary, Activity Log. `print-button.tsx` reused
  from session 17 on every report.

**Deliberately not built, and why** (shown in the catalogue as greyed-out cards with the
reason, not silently omitted):
- **Batch Wise Stock Summary / Expiry Management** — the schema has no `Batch` model;
  `SalesDocItem.batchId`/`PurchaseDocItem.batchId` are bare optional strings with no
  backing table. Needs a real Batch/expiry-tracking feature added to Inventory first.
- **Annex 13 Report / Annex 5 Materialised View Report** — these are precise statutory
  IRD filing formats. Per the project's inspect-don't-guess rule, fabricating a specific
  column layout for a tax filing document without the official spec (or an authenticated
  look at the reference app's own screen) risks handing the client a wrong filing —
  worse than not having the report at all.
- **Budget vs Expense Report** — needs the entire Budget module (Budget Heading, Budget,
  Allocation, Fund) built first; that module doesn't exist in the schema yet at all, and
  is out of scope for a "reports" pass.
- **Statement of Other Comprehensive Income** — niche NFRS disclosure (asset revaluation,
  FX translation reserves) with no underlying feature producing OCI items yet; nothing
  to report.
- **Customer Aging Report** — same data as the already-built Receivable Aging; catalogue
  links both names to that one report rather than duplicating it.

Verified every new report live in the browser (not just typecheck): Transaction List and
General Ledger Summary both showed period debit = period credit exactly, confirming the
query logic against `postVoucher()`'s enforced invariant; Sales Report's row click-through
to the invoice detail/letterhead page (built last session) worked; Journal Report's
row-expand showed the correct two-line entry; Favourites star-pinning persisted a report
into its own section. `npm run typecheck`, `npx eslint src` (including fixing several
React-Compiler purity-rule violations — `Date.now()` can't be called directly in a
component body, `new Date()` can; the existing codebase's `setTimeout(() => setState(...))`
wrapper is this project's established workaround for "setState in effect"), and a clean
`rm -rf .next && npm run build` all pass.

**Still pending** (client's earlier explicit ask, not started this session): the 12
stubbed Settings sub-pages (Signin & Security, Users & Permissions, Bill Footer, Bank
Detail, Custom Fields, Banks, Custom Status, Barcode, Invoice Setting, Invoice Import
Setting, Backup Data, Tour).

### Session 17 — 2026-09-11 (Vouchers UI polish + printed letterhead)
Client asked for three things: finish the two stubbed voucher pages, place the real
`bela-logo.png` file the client dropped into `public/` "like letterhead/bill head", and
(next) build out the remaining Settings sub-pages.

**Vouchers UI polish:**
- **Contra Voucher** (`src/app/(app)/dashboard/vouchers/contra-voucher/page.tsx`, new) —
  turned out to need only a thin wrapper: `VoucherWorkspace` and `listVouchers()` were
  already generic enough to support `type="CONTRA"`, so no service changes were needed.
- **Stock Journal** (new: `src/server/accounts/schemas.ts` `stockJournalCreate`,
  `src/server/accounts/service.ts` `createStockJournal()`, `src/app/api/accounts/stock-journal/route.ts`,
  `src/app/(app)/dashboard/vouchers/stock-journal/{page,stock-journal-workspace}.tsx`) —
  distinct from the existing Inventory Adjustment feature (quantity-only, no GL impact):
  Stock Journal posts a real GL voucher for the value gain/loss against the NFRS
  `COS-01-0003` "Inventory Adjustment Account" ledger, routed against the correct
  `INV-01-0001`/`INV-02-0001` inventory ledger via the existing `InventoryRole` enum
  (mirrors `purchase/service.ts`'s pattern). Reuses `postVoucher()` (GL) and
  `postStockMovement()` (qty) as the sole writers — no duplicated posting logic.

**Letterhead / logo placement** (the literal ask — "place this logo... like letter head
bill head etc"):
- `src/components/print-button.tsx` (new) — shared `<PrintButton>`, `data-app-chrome`
  baked in so callers don't have to remember it.
- `src/components/print-letterhead.tsx` (new) — `<PrintLetterhead>`: `BrandLogo` + company
  legal/display name, address, phone(s), email, PAN, plus a document title/number/date
  block — fed from the existing `getCompanyInfo()` service, no schema changes needed.
  Deliberately **not** `data-print-only` — it's part of the actual document, shown
  on-screen and on paper alike, unlike the sidebar/header chrome.
- **Sales Invoice detail + print page** (new:
  `src/app/(app)/dashboard/sales/invoice/[id]/{page,invoice-detail-view}.tsx`, using the
  already-existing `getSalesDoc()` + `/api/sales/invoices/[id]`) and the symmetric
  **Purchase Invoice detail + print page** (new:
  `src/app/(app)/dashboard/purchase/purchase-bills/[id]/{page,purchase-invoice-detail-view}.tsx`,
  `getPurchaseDoc()`) — fills the "no invoice detail/print view" gap noted since session 7.
  Both list-page workspaces (`invoice-workspace.tsx`, `purchase-invoice-workspace.tsx`)
  now `router.push()` to the detail view on row click.
- Favicon/app-icon: `src/app/icon.png`, `src/app/apple-icon.png` (Next.js file-convention,
  copied from `public/bela-logo.png`); `BrandLogo`'s `LOGO_SRC` and `global-error.tsx`
  updated to point at the real filename instead of the old placeholder `/logo.png`.
- Print CSS infrastructure (`src/app/globals.css` `@media print` block, `data-app-chrome`
  marker on `app-shell.tsx`'s sidebar/header and `tab-nav.tsx`) — forces light color-scheme
  on print (deliberate: a printed page should be ink-economical and professional
  regardless of the viewer's dark-mode preference) and hides on-screen-only chrome.
  Applied to the 6 report Print buttons + trial balance's raw button that pre-dated
  `<PrintButton>`.

Verified live in-browser (not just typecheck): logged in, clicked through from the Sales
Invoice and Purchase Invoice list pages to their new detail pages — letterhead renders
with the real logo, company info, and NFRS-correct totals; Back/Print buttons work.
`npm run typecheck`, `npx eslint src`, and a clean `rm -rf .next && npm run build` all
pass with the new `/dashboard/sales/invoice/[id]` and `/dashboard/purchase/purchase-bills/[id]`
routes compiling as dynamic (ƒ) pages.

**Still pending** (client's explicit next item): the 12 remaining stubbed Settings
sub-pages (Signin & Security, Users & Permissions, Bill Footer, Bank Detail, Custom
Fields, Banks, Custom Status, Barcode, Invoice Setting, Invoice Import Setting, Backup
Data, Tour) — only Company Info/Fiscal Year/Tax are built so far.

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
