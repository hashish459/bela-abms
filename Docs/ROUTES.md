# ROUTES

`A` = requires auth (proxy-guarded). `P:<key>` = permission module key checked server-side.
Envelope: `{ ok:true, data }` / `{ ok:false, error:{ code, message, details? } }`.

## Implemented — UI

| Route | Auth | Page | Notes |
|-------|------|------|-------|
| `/` | – | redirect | → `/dashboard` if session, else `/login` |
| `/login` | – | `(auth)/login` | email+password; `?next=` return path |
| `/dashboard` | A | `(app)/dashboard` | real KPIs (Sales/Purchase/Profit/Cash/Aging/Low-stock), permission-scoped, sales trend chart, recent activity |
| `/dashboard/settings/company-info` | A · `settings.company_info` | Company Info | legal identity + IRD/CBMS fields (stubbed) |
| `/dashboard/settings/fiscal-year` | A · `settings.fiscal_year` | Fiscal Year | BS label + AD dates, active flag |
| `/dashboard/settings/tax` | A · `settings.tax` | Tax | rate list; system rows locked |
| `/dashboard/settings/*` (other) | A | wrapped by `settings/layout.tsx` sub-nav | fall through to stub until built |
| `/dashboard/accounts/charts-of-accounts` | A · `accounts.charts_of_accounts` | Chart of Accounts | collapsible AS/LI/EQ/IN/EX tree + Add Account |
| `/dashboard/accounts/contacts` | A · `accounts.contacts` | Contacts | Customers / Suppliers tabs + contact form |
| `/dashboard/vouchers/journal-voucher` | A · `vouchers.journal_voucher` | Journal Voucher | list + double-entry entry form |
| `/dashboard/vouchers/contra-voucher` | A · `vouchers.contra_voucher` | Contra Voucher | (uses `voucher-workspace`, page pending) |
| `/dashboard/reports/accounting/trial-balance` | A · `reports.accounting_reports` | Trial Balance | grouped, print |
| `/dashboard/reports/accounting/ledger` | A · `reports.accounting_reports` | Ledger Report | `LedgerPicker` + running statement |
| `/dashboard/reports/accounting/profit-loss` | A · `reports.accounting_reports` | Profit & Loss | date range, grouped by account head |
| `/dashboard/reports/accounting/balance-sheet` | A · `reports.accounting_reports` | Balance Sheet | as-of date; ties via Current Year Profit line |
| `/dashboard/reports/accounting/day-book` | A · `reports.accounting_reports` | Day Book | single date, full voucher/line detail |
| `/dashboard/reports/tax/vat-return` | A · `reports.tax_reports` | VAT Return | output vs input VAT, date range |
| `/dashboard/reports/receivable/aging` | A · `reports.receivable_reports` | Receivable Aging | 0-30/31-60/61-90/90+ buckets by customer |
| `/dashboard/reports/payable/aging` | A · `reports.payable_reports` | Payable Aging | 0-30/31-60/61-90/90+ buckets by supplier |
| `/dashboard/help/getting-started` | A · `help.user_manuals` | Getting Started | orientation, key concepts, first-login checklist |
| `/dashboard/help/accounts-gl` | A · `help.user_manuals` | Accounts & GL manual | COA hierarchy, double-entry, T-account diagram |
| `/dashboard/help/sales` | A · `help.user_manuals` | Sales manual | document chain, worked GL example |
| `/dashboard/help/purchase` | A · `help.user_manuals` | Purchase manual | landed cost worked example |
| `/dashboard/help/inventory` | A · `help.user_manuals` | Inventory manual | stock movement model, weighted-avg cost |
| `/dashboard/help/reports` | A · `help.user_manuals` | Reports manual | what each report means, one-sale-five-reports example |
| `/dashboard/help/roles-permissions` | A · `help.user_manuals` | Roles & Permissions manual | RBAC model explained |
| `/dashboard/system/info` | A · `system.system_info` | System Info | app/process/host/DB/network diagnostics, module record counts |
| `/dashboard/system/query` | A · `system.database_console` | Database Console | read-only SQL console (SELECT/WITH only, admin-only) |
| `/dashboard/fixed-assets/register` | A · `fixed_assets.asset_register` | Asset Register | list + add form + detail (depreciation history) + dispose |
| `/dashboard/fixed-assets/depreciation` | A · `fixed_assets.depreciation` | Depreciation | run history + "Run Depreciation" |
| `/dashboard/inventory/product-category` | A · `inventory.product_category` | Product Category | tree + CRUD |
| `/dashboard/inventory/products` | A · `inventory.product_item` | Products | Goods/Services/Expense tabs + Add Product |
| `/dashboard/inventory/unit-measurement` | A · `inventory.units_of_measurement` | Units | CRUD |
| `/dashboard/inventory/warehouse` | A · `inventory.warehouse` | Warehouse | CRUD |
| `/dashboard/inventory/inventory-adjustment` | A · `inventory.inventory_adjustment` | Inventory Adjustment | list + entry (line grid) |
| `/dashboard/reports/inventory/stock-summary` | A · `reports.inventory_reports` | Stock Summary | on-hand, low-stock flag |
| `/dashboard/sales/invoice` | A · `sales.sales_invoice` | Sales Invoice | list + form (immutability notice) |
| `/dashboard/sales/quotation` | A · `sales.quotation` | Quotation | list + form + convert |
| `/dashboard/sales/sales-order` | A · `sales.sales_order` | Sales Order | list + form + convert |
| `/dashboard/sales/receipt` | A · `sales.receipt` | Receipts | list + payment form (against invoice) |
| `/dashboard/sales/credit-note` | A · `sales.credit_note` | Credit Note | list + return form (pick invoice) |
| `/dashboard/purchase/purchase-order` | A · `purchase.purchase_order` | Purchase Order | list + form + convert |
| `/dashboard/purchase/purchase-bills` | A · `purchase.purchase_invoice` | Purchase Invoice | list + form (excise/custom duty columns, immutability notice) |
| `/dashboard/purchase/supplier-payment` | A · `purchase.payment` | Payments | list + payment form (against invoice) |
| `/dashboard/purchase/debit-note` | A · `purchase.debit_notes` | Debit Notes | list + return form (pick invoice) |
| `/dashboard/:slug*` | A | `(app)/dashboard/[...slug]` | catch-all: permission-gated "not implemented" stub |

## Implemented — API

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/api/auth/login` | – | verify creds → issue access+refresh cookies, audit LOGIN, throttle |
| POST | `/api/auth/logout` | A | revoke refresh token, clear cookies, audit LOGOUT |
| POST | `/api/auth/refresh` | cookie | rotate refresh token → new pair |
| GET | `/api/auth/me` | A | current user + company + active fiscal year + effective permissions |
| GET | `/api/menu` | A | permission-filtered navigation tree |
| GET/POST | `/api/settings/fiscal-years` | A · `settings.fiscal_year` view/create | list / create fiscal year (one active per company) |
| PATCH | `/api/settings/fiscal-years/[id]` | A · `settings.fiscal_year` update | edit / set active |
| GET/POST | `/api/settings/tax-rates` | A · `settings.tax` view/create | list / create tax rate |
| PATCH/DELETE | `/api/settings/tax-rates/[id]` | A · `settings.tax` update/delete | edit / soft-delete (system rows locked) |
| GET/PUT | `/api/settings/company-info` | A · `settings.company_info` view/update | company profile; CBMS password encrypted, never returned |
| GET | `/api/accounts/chart` | A · `accounts.charts_of_accounts` read | 3-level COA tree |
| GET | `/api/accounts/groups` | A · `accounts.charts_of_accounts` read | flat group list for pickers |
| GET/POST | `/api/accounts/ledgers` | A · `accounts.charts_of_accounts` read/create | ledger search (`?search&groups&heads&contactKind`) / create (auto-code, opening → OPENING voucher) |
| PATCH/DELETE | `/api/accounts/ledgers/[id]` | A · `accounts.charts_of_accounts` update/delete | edit / soft-delete (blocked if used, system rows locked) |
| GET/POST | `/api/accounts/contacts` | A · `accounts.contacts` read/create | `?kind=CUSTOMER\|SUPPLIER`; create under TRR-01/TRP-01 |
| PATCH | `/api/accounts/contacts/[id]` | A · `accounts.contacts` update | edit contact |
| GET/POST | `/api/accounts/vouchers` | A · `vouchers.journal_voucher\|contra_voucher` | `?type=JOURNAL\|CONTRA`; POST posts via `postVoucher` (ΣDr=ΣCr enforced) |
| GET | `/api/accounts/vouchers/[id]` | A · `vouchers.journal_voucher` read | voucher detail with lines |
| GET | `/api/reports/trial-balance` | A · `reports.accounting_reports` read | active FY; `?asOf=` |
| GET | `/api/reports/ledger/[id]` | A · `reports.accounting_reports` read | running ledger statement |
| GET/POST | `/api/inventory/categories` | A · `inventory.product_category` | list / create (self-nesting) |
| PATCH/DELETE | `/api/inventory/categories/[id]` | A · `inventory.product_category` | edit / delete (blocked if in use) |
| GET/POST | `/api/inventory/units` | A · `inventory.units_of_measurement` | list / create |
| PATCH | `/api/inventory/units/[id]` | A · `inventory.units_of_measurement` update | edit |
| GET/POST | `/api/inventory/warehouses` | A · `inventory.warehouse` | list / create (first = default) |
| PATCH | `/api/inventory/warehouses/[id]` | A · `inventory.warehouse` update | edit |
| GET/POST | `/api/inventory/products` | A · `inventory.product_item` | `?kind=GOODS\|SERVICE\|EXPENSE&search&page`; POST optionally posts OPENING stock |
| GET/PATCH | `/api/inventory/products/[id]` | A · `inventory.product_item` | detail / edit |
| GET/POST | `/api/inventory/adjustments` | A · `inventory.inventory_adjustment` | list / create (posts ADJUSTMENT_IN/OUT movements, `ADJ-00001`) |
| GET | `/api/reports/stock-summary` | A · `reports.inventory_reports` read | on-hand per product (Σ movements) |
| POST | `/api/sales/calc` | A · `sales.sales_invoice` read | preview totals (same engine as the write) |
| GET/POST | `/api/sales/invoices` | A · `sales.sales_invoice` | list / create (posts GL + stock + COGS; **immutable, no PATCH/DELETE**) |
| GET | `/api/sales/invoices/[id]` | A · `sales.sales_invoice` read | invoice detail with items + receipts |
| GET/POST | `/api/sales/quotations` | A · `sales.quotation` | list / create (no GL/stock) |
| GET/POST | `/api/sales/orders` | A · `sales.sales_order` | list / create (no GL/stock) |
| POST | `/api/sales/docs/[id]/convert` | A · `sales.sales_invoice` create | quotation→order→invoice prefill |
| GET/POST | `/api/sales/receipts` | A · `sales.receipt` | list / create (Dr cash / Cr customer; updates invoice status) |
| GET/POST | `/api/sales/credit-notes` | A · `sales.credit_note` | list / create (stock IN + reverse GL + reverse COGS; capped at invoice value) |
| POST | `/api/purchase/calc` | A · `purchase.purchase_invoice` read | preview totals (excise/custom duty capitalized) |
| GET/POST | `/api/purchase/orders` | A · `purchase.purchase_order` | list / create (no GL/stock) |
| GET/POST | `/api/purchase/invoices` | A · `purchase.purchase_invoice` | list / create (posts GL + stock at landed cost; **immutable, no PATCH/DELETE**) |
| GET | `/api/purchase/invoices/[id]` | A · `purchase.purchase_invoice` read | invoice detail with items + payments |
| POST | `/api/purchase/docs/[id]/convert` | A · `purchase.purchase_invoice` create | purchase order → invoice prefill |
| GET/POST | `/api/purchase/payments` | A · `purchase.payment` | list / create (Dr supplier / Cr cash-bank; updates invoice status) |
| GET/POST | `/api/purchase/debit-notes` | A · `purchase.debit_notes` | list / create (stock OUT + reverse GL at the debit note's own valuation; capped at invoice value) |
| GET | `/api/system/info` | A · `system.system_info` read | process/host/DB latency/network + per-module record counts |
| POST | `/api/system/query` | A · `system.database_console` read | read-only diagnostic SQL (SELECT/WITH only, 200-row cap, audited) |
| GET/POST | `/api/assets` | A · `fixed_assets.asset_register` | list / create (posts Dr Asset-at-cost / Cr Supplier-or-Cash-Bank) |
| GET | `/api/assets/[id]` | A · `fixed_assets.asset_register` read | detail incl. full depreciation-entry history |
| POST | `/api/assets/[id]/dispose` | A · `fixed_assets.asset_register` update | catch-up depreciation + Dr AccumDep/Proceeds/Loss / Cr Asset+Gain |
| GET/POST | `/api/assets/depreciation-runs` | A · `fixed_assets.depreciation` | list runs / post a batch run (one voucher, grouped per category) |
| GET | `/api/reports/profit-loss` | A · `reports.accounting_reports` read | `?from&to`; income vs expense by account head |
| GET | `/api/reports/balance-sheet` | A · `reports.accounting_reports` read | `?asOf`; assets vs liabilities+equity+current-year-profit |
| GET | `/api/reports/day-book` | A · `reports.accounting_reports` read | `?date`; every voucher posted that day |
| GET | `/api/reports/vat-return` | A · `reports.tax_reports` read | `?from&to`; output/input VAT + taxable sales/purchase net of returns |
| GET | `/api/reports/aging/receivable` | A · `reports.receivable_reports` read | `?asOf`; outstanding Sales Invoices net of Credit Notes, bucketed |
| GET | `/api/reports/aging/payable` | A · `reports.payable_reports` read | `?asOf`; outstanding Purchase Invoices net of Debit Notes, bucketed |

## Planned — API (per module, Phase 5) — grouped by domain

```
/api/companies            /api/branches           /api/fiscal-years
/api/users  /api/roles  /api/permissions          /api/settings/*  (tax, custom-fields, banks, …)
/api/vouchers          /api/ledger
/api/budget/headings /api/budget/budgets /api/budget/allocations /api/budget/funds
/api/tokens            /api/crm/*              /api/documents/*        /api/store/*
/api/reports/<report-key>   (POST with filter body → data)
```

Every endpoint: Zod validation · `requireSession()` · `requirePermission(key, action)` ·
`HttpError`→envelope · audit for mutations · `$transaction` for multi-entity writes.

## Route groups (Next.js App Router)
- `app/(auth)/*` — unauthenticated (login)
- `app/(app)/*` — wrapped by `(app)/layout.tsx` → `getSession()` redirect + `AppShell`
- `app/api/*` — route handlers; `src/proxy.ts` redirects unauthenticated `/dashboard/*` → `/login`
