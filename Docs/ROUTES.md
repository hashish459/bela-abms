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
| `/dashboard/settings/users` | A · `settings.users` | User & Permissions | 3 tabs: Users (CRUD + role assignment), Roles & Permissions (`settings.roles_and_permissions` — full CRUD permission-matrix editor over all `PermissionModule` rows, "Grant all"/"Clear" per group), Companies (Branch CRUD) |
| `/dashboard/settings/banks` | A · `settings.banks` | Banks | master bank-name list |
| `/dashboard/settings/bank-detail` | A · `settings.bank_detail` | Bank Detail | company's own bank accounts; default one feeds Bill Footer |
| `/dashboard/settings/bill-footer` | A · `settings.bill_footer` | Bill Footer | terms, bank account, signatory, note — printed on Sales/Purchase invoice detail+print pages |
| `/dashboard/settings/invoice-setting` | A · `settings.invoice_setting` | Invoice Setting | show/hide HS Code, Discount, bank details, QR toggles (read by the print pages); default terms/notes |
| `/dashboard/settings/custom-fields` | A · `settings.custom_fields` | Custom Fields | UDF definitions per module — active fields render dynamically on that module's entry form (session 22) |
| `/dashboard/settings/custom-status` | A · `settings.custom_status` | Custom Status | descriptive per-module labels (MVP — SalesDoc/PurchaseDoc.status stays on its GL-driving enum) |
| `/dashboard/settings/barcode` | A · `settings.barcode` | Barcode | symbology/prefix/label-size config; both CODE128 and EAN13 (session 22) render for real |
| `/dashboard/settings/invoice-import-setting` | A · `settings.invoice_import_setting` | Invoice Import Setting | CSV column-mapping templates (MVP — upload/parse pipeline is a follow-on) |
| `/dashboard/settings/backup` | A · `settings.backup_data` | Backup Data | on-demand full JSON export of company data |
| `/dashboard/settings/signin-security` | A · `settings.signin_and_security` | Signin & Security | change password (self-service, no permission gate) + active `RefreshToken` sessions with revoke |
| `/dashboard/settings/tour` | A · `settings.tour` | Tour | static first-time-setup checklist linking into the app |
| `/dashboard/settings/*` (other) | A | wrapped by `settings/layout.tsx` sub-nav | fall through to stub until built |
| `/dashboard/budget/budget-heading` | A · `budget.budget_heading` | Budget Heading | budgetable line items; MANUAL or COA_GROUP-linked |
| `/dashboard/budget/budget` | A · `budget.budget` | Budget | one container per fiscal year; links to Allocation |
| `/dashboard/budget/allocation` | A · `budget.allocation` | Allocation | `?budgetId=` picks the budget; editable amount per heading |
| `/dashboard/budget/fund` | A · `budget.fund` | Fund | internal funding-source master list (term loan, retained earnings, …) |
| `/dashboard/reports/budget/budget-vs-expense` | A · `reports.budget_reports` | Budget vs Expense Report | allocated vs actual (from live GL movement) per heading, with variance/utilization |
| `/dashboard/accounts/charts-of-accounts` | A · `accounts.charts_of_accounts` | Chart of Accounts | collapsible AS/LI/EQ/IN/EX tree + Add Account |
| `/dashboard/accounts/contacts` | A · `accounts.contacts` | Contacts | Customers / Suppliers tabs + contact form |
| `/dashboard/vouchers/journal-voucher` | A · `vouchers.journal_voucher` | Journal Voucher | list + double-entry entry form |
| `/dashboard/vouchers/contra-voucher` | A · `vouchers.contra_voucher` | Contra Voucher | list + entry form (uses shared `voucher-workspace`) |
| `/dashboard/vouchers/stock-journal` | A · `vouchers.stock_journal` | Stock Journal | list + entry form; posts GL value gain/loss (`COS-01-0003`) + stock movement, distinct from Inventory Adjustment (qty-only, no GL) |
| `/dashboard/reports` | A | Reports catalogue | clone of the reference app's report catalogue — 8 permission-scoped groups, ~20 reports, client-side Favourites pinning (localStorage) |
| `/dashboard/reports/accounting/transaction-list` | A · `reports.accounting_reports` | Transaction List | every posted GL line, date range + ledger filter, paginated |
| `/dashboard/reports/accounting/general-ledger-summary` | A · `reports.accounting_reports` | General Ledger Summary | per-ledger opening/debit/credit/closing for a date range (vs. Trial Balance's cumulative as-of) |
| `/dashboard/reports/accounting/trial-balance` | A · `reports.accounting_reports` | Trial Balance | grouped, print |
| `/dashboard/reports/accounting/contra-report` | A · `reports.accounting_reports` | Contra Report | read-only Contra voucher report, date range, expand-to-lines |
| `/dashboard/reports/accounting/profit-loss` | A · `reports.accounting_reports` | Profit & Loss | date range, grouped by account head |
| `/dashboard/reports/accounting/day-book` | A · `reports.accounting_reports` | Day Book | single date, full voucher/line detail |
| `/dashboard/reports/accounting/ledger` | A · `reports.accounting_reports` | Ledger Report | `LedgerPicker` + running statement |
| `/dashboard/reports/accounting/journal-report` | A · `reports.accounting_reports` | Journal Report | read-only Journal voucher report, date range, expand-to-lines |
| `/dashboard/reports/accounting/balance-sheet` | A · `reports.accounting_reports` | Balance Sheet | as-of date; ties via Current Year Profit line |
| `/dashboard/reports/sales/sales-report` | A · `reports.sales_reports` | Sales Report | date range, PAN+VAT columns (doubles as the Tax variant), click-through to invoice detail |
| `/dashboard/reports/sales/sales-profit-report` | A · `reports.sales_reports` | Sales Profit Report | per-invoice gross profit, reading back the COGS voucher `postVoucher` already wrote at sale time |
| `/dashboard/reports/sales/sales-return-report` | A · `reports.sales_reports` | Sales Return Report | Credit Notes, date range |
| `/dashboard/reports/sales/receipt-report` | A · `reports.sales_reports` | Receipt Report | Receipts, date range |
| `/dashboard/reports/purchase/purchase-report` | A · `reports.purchase_reports` | Purchase Report | date range, PAN+VAT columns, click-through to purchase invoice detail |
| `/dashboard/reports/purchase/purchase-return-report` | A · `reports.purchase_reports` | Purchase Return Report | Debit Notes, date range |
| `/dashboard/reports/purchase/payment-report` | A · `reports.purchase_reports` | Payment Report | Supplier Payments, date range |
| `/dashboard/reports/receivable/aging` | A · `reports.receivable_reports` | Receivable Aging | 0-30/31-60/61-90/90+ buckets by customer (also serves as "Customer Aging Report") |
| `/dashboard/reports/payable/aging` | A · `reports.payable_reports` | Payable Aging | 0-30/31-60/61-90/90+ buckets by supplier |
| `/dashboard/reports/system/activity-log` | A · `reports.system_reports` | Activity Log | `AuditLog` viewer, date range, paginated |
| `/dashboard/reports/tax/vat-return` | A · `reports.tax_reports` | VAT Return | output vs input VAT, date range |
| `/dashboard/reports/tax/monthly-tax-summary` | A · `reports.tax_reports` | Monthly Tax Summary | output/input VAT bucketed by calendar month |
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
| `/dashboard/manufacturing/bom` | A · `manufacturing.bill_of_materials` | Bill of Materials | list + add form (output + components + labor) |
| `/dashboard/manufacturing/production-order` | A · `manufacturing.production_order` | Production Order | list + run form + detail (components consumed) |
| `/dashboard/workshop/job-card` | A · `workshop.job_card` | Job Card | list + intake form (optional estimate) + Complete & Bill + Cancel |
| `/dashboard/workshop/technician` | A · `workshop.technician` | Technician | list + add/edit form |
| `/dashboard/inventory/product-category` | A · `inventory.product_category` | Product Category | tree + CRUD |
| `/dashboard/inventory/products` | A · `inventory.product_item` | Products | Goods/Services/Expense tabs + Add Product; Goods rows link to a Barcode column |
| `/dashboard/inventory/products/[id]/barcode` | A · `inventory.product_item` | Barcode Label | generate a barcode value + printable label (Code128 or EAN13, per Settings › Barcode) sized per that setting |
| `/dashboard/inventory/unit-measurement` | A · `inventory.units_of_measurement` | Units | CRUD |
| `/dashboard/inventory/warehouse` | A · `inventory.warehouse` | Warehouse | CRUD |
| `/dashboard/inventory/inventory-adjustment` | A · `inventory.inventory_adjustment` | Inventory Adjustment | list + entry (line grid) |
| `/dashboard/reports/inventory/stock-summary` | A · `reports.inventory_reports` | Stock Summary | on-hand, low-stock flag |
| `/dashboard/reports/inventory/batch-wise-stock-summary` | A · `reports.inventory_reports` | Batch Wise Stock Summary | on-hand per batch/lot; populated once a Purchase Invoice line records a batch number |
| `/dashboard/reports/inventory/expiry-management` | A · `reports.inventory_reports` | Expiry Management | batches with stock on hand that are expired or expiring within 90 days |
| `/dashboard/sales/invoice` | A · `sales.sales_invoice` | Sales Invoice | list + form (immutability notice); rows click through to detail |
| `/dashboard/sales/invoice/[id]` | A · `sales.sales_invoice` read | Sales Invoice detail | printable letterhead + line items + totals |
| `/dashboard/sales/quotation` | A · `sales.quotation` | Quotation | list + form + convert |
| `/dashboard/sales/sales-order` | A · `sales.sales_order` | Sales Order | list + form + convert |
| `/dashboard/sales/receipt` | A · `sales.receipt` | Receipts | list + payment form (against invoice) |
| `/dashboard/sales/credit-note` | A · `sales.credit_note` | Credit Note | list + return form (pick invoice) |
| `/dashboard/purchase/purchase-order` | A · `purchase.purchase_order` | Purchase Order | list + form + convert |
| `/dashboard/purchase/purchase-bills` | A · `purchase.purchase_invoice` | Purchase Invoice | list + form (excise/custom duty columns, immutability notice); rows click through to detail |
| `/dashboard/purchase/purchase-bills/[id]` | A · `purchase.purchase_invoice` read | Purchase Invoice detail | printable letterhead + line items (landed amount) + totals |
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
| POST | `/api/settings/signin-security/change-password` | A (self, no permission gate) | own password change; CSRF-checked via `assertCsrf()` since it bypasses `guard()` |
| GET | `/api/settings/signin-security/sessions` | A (self) | own active `RefreshToken` rows, capped at 15 |
| DELETE | `/api/settings/signin-security/sessions/[id]` | A (self) | revoke one of own sessions |
| GET/POST | `/api/settings/users` | A · `settings.users` view/create | list / create user (+ `UserCompany` link + `UserRole` links) |
| PATCH | `/api/settings/users/[id]` | A · `settings.users` update | edit profile/status/roles; blocks self-disable and disabling the last active admin |
| GET | `/api/settings/permission-modules` | A · `settings.roles_and_permissions` view | the full `PermissionModule` catalogue, grouped |
| GET/POST | `/api/settings/roles` | A · `settings.roles_and_permissions` view/create | list / create role + its `RolePermission` matrix |
| PATCH/DELETE | `/api/settings/roles/[id]` | A · `settings.roles_and_permissions` update/delete | edit name/matrix; delete blocked for system roles or roles with assigned users |
| GET/POST | `/api/settings/branches` | A · `settings.users` view/create | Companies tab — Branch CRUD |
| DELETE | `/api/settings/branches/[id]` | A · `settings.users` delete | soft-delete a branch |
| GET/POST | `/api/settings/banks` | A · `settings.banks` view/create | master bank-name list |
| PATCH/DELETE | `/api/settings/banks/[id]` | A · `settings.banks` update/delete | delete blocked while it has bank accounts |
| GET/POST | `/api/settings/bank-accounts` | A · `settings.bank_detail` view/create | the company's own registered accounts |
| PATCH/DELETE | `/api/settings/bank-accounts/[id]` | A · `settings.bank_detail` update/delete | setting `isDefault` clears it on all others |
| GET/POST | `/api/settings/custom-fields` | A · `settings.custom_fields` view/create | UDF definitions |
| PATCH/DELETE | `/api/settings/custom-fields/[id]` | A · `settings.custom_fields` update/delete | |
| GET | `/api/custom-fields?module=X` | any signed-in user with a company (not gated on `settings.custom_fields` — that permission governs managing definitions, not using them) | active field definitions for one module, read by every entry form's `<CustomFieldsFields>` |
| GET/POST | `/api/settings/custom-status` | A · `settings.custom_status` view/create | descriptive per-module status labels |
| PATCH/DELETE | `/api/settings/custom-status/[id]` | A · `settings.custom_status` update/delete | |
| GET/PUT | `/api/settings/barcode` | A · `settings.barcode` view/update | singleton `BarcodeSetting` |
| GET/PUT | `/api/settings/invoice-setting` | A · `settings.invoice_setting` view/update | singleton `InvoiceSetting`, read by the invoice print pages |
| GET/POST | `/api/settings/invoice-import-templates` | A · `settings.invoice_import_setting` view/create | CSV column-mapping templates |
| PATCH/DELETE | `/api/settings/invoice-import-templates/[id]` | A · `settings.invoice_import_setting` update/delete | |
| GET/PUT | `/api/settings/bill-footer` | A · `settings.bill_footer` view/update | singleton `BillFooterSetting`, read by the invoice print pages |
| GET | `/api/settings/backup` | A · `settings.backup_data` view | streams a JSON file (`Content-Disposition: attachment`) of every company-scoped table |
| GET | `/api/accounts/chart` | A · `accounts.charts_of_accounts` read | 3-level COA tree |
| GET | `/api/accounts/groups` | A · `accounts.charts_of_accounts` read | flat group list for pickers |
| GET/POST | `/api/accounts/ledgers` | A · `accounts.charts_of_accounts` read/create | ledger search (`?search&groups&heads&contactKind`) / create (auto-code, opening → OPENING voucher) |
| PATCH/DELETE | `/api/accounts/ledgers/[id]` | A · `accounts.charts_of_accounts` update/delete | edit / soft-delete (blocked if used, system rows locked) |
| GET/POST | `/api/accounts/contacts` | A · `accounts.contacts` read/create | `?kind=CUSTOMER\|SUPPLIER`; create under TRR-01/TRP-01; POST body's optional `customFields` (module `CONTACT`) saved alongside |
| PATCH | `/api/accounts/contacts/[id]` | A · `accounts.contacts` update | edit contact |
| GET/POST | `/api/accounts/vouchers` | A · `vouchers.journal_voucher\|contra_voucher` | `?type=JOURNAL\|CONTRA`; POST posts via `postVoucher` (ΣDr=ΣCr enforced) |
| GET | `/api/accounts/vouchers/[id]` | A · `vouchers.journal_voucher` read | voucher detail with lines |
| GET/POST | `/api/accounts/stock-journal` | A · `vouchers.stock_journal` | list / create — posts a GL voucher (value gain/loss against `COS-01-0003`) + a stock movement, unlike Inventory Adjustment which is qty-only |
| GET | `/api/reports/trial-balance` | A · `reports.accounting_reports` read | active FY; `?asOf=` |
| GET | `/api/reports/ledger/[id]` | A · `reports.accounting_reports` read | running ledger statement |
| GET/POST | `/api/inventory/categories` | A · `inventory.product_category` | list / create (self-nesting) |
| PATCH/DELETE | `/api/inventory/categories/[id]` | A · `inventory.product_category` | edit / delete (blocked if in use) |
| GET/POST | `/api/inventory/units` | A · `inventory.units_of_measurement` | list / create |
| PATCH | `/api/inventory/units/[id]` | A · `inventory.units_of_measurement` update | edit |
| GET/POST | `/api/inventory/warehouses` | A · `inventory.warehouse` | list / create (first = default) |
| PATCH | `/api/inventory/warehouses/[id]` | A · `inventory.warehouse` update | edit |
| GET/POST | `/api/inventory/products` | A · `inventory.product_item` | `?kind=GOODS\|SERVICE\|EXPENSE&search&page`; POST optionally posts OPENING stock; POST body's optional `customFields` (module `PRODUCT`) saved alongside, summarized as a list column |
| GET/PATCH | `/api/inventory/products/[id]` | A · `inventory.product_item` | detail / edit |
| POST | `/api/inventory/products/[id]/barcode` | A · `inventory.product_item` update | claims the next `prefix+nextNumber` value from Settings › Barcode and assigns it to the product permanently; no-op if already assigned |
| GET/POST | `/api/inventory/adjustments` | A · `inventory.inventory_adjustment` | list / create (posts ADJUSTMENT_IN/OUT movements, `ADJ-00001`) |
| GET | `/api/reports/stock-summary` | A · `reports.inventory_reports` read | on-hand per product (Σ movements) |
| GET | `/api/reports/batch-wise-stock-summary` | A · `reports.inventory_reports` read | `?search`; on-hand per batch/lot |
| GET | `/api/reports/expiry-management` | A · `reports.inventory_reports` read | `?withinDays` (default 90); expired/near-expiry batches with stock |
| GET | `/api/inventory/batches` | A · `inventory.product_item` read | `?productId&warehouseId` (warehouse defaults to the company's default); feeds the Sales line editor's batch picker, FEFO-sorted |
| GET/POST | `/api/budget/headings` | A · `budget.budget_heading` | list / create budget headings |
| PATCH/DELETE | `/api/budget/headings/[id]` | A · `budget.budget_heading` update/delete | delete blocked while it has allocations |
| GET/POST | `/api/budget/funds` | A · `budget.fund` | list / create funding sources |
| PATCH/DELETE | `/api/budget/funds/[id]` | A · `budget.fund` update/delete | delete blocked while assigned to a budget |
| GET/POST | `/api/budget/budgets` | A · `budget.budget` | list / create budgets |
| PATCH/DELETE | `/api/budget/budgets/[id]` | A · `budget.budget` update/delete | |
| GET/PUT | `/api/budget/budgets/[id]/allocations` | A · `budget.allocation` | GET: every active heading with its current amount (0 if unset). PUT: bulk upsert `{allocations: [{budgetHeadingId, amount}]}` |
| GET | `/api/reports/budget-vs-expense` | A · `reports.budget_reports` read | `?budgetId`; allocated vs actual (live GL movement) per heading, `actual: null` for MANUAL headings |
| POST | `/api/sales/calc` | A · `sales.sales_invoice` read | preview totals (same engine as the write) |
| GET/POST | `/api/sales/invoices` | A · `sales.sales_invoice` | list / create (posts GL + stock + COGS; **financial fields are immutable, no edit/delete**); POST body's optional `customFields` (module `SALES_INVOICE`) saved at creation only |
| GET/PATCH | `/api/sales/invoices/[id]` | A · `sales.sales_invoice` read/update | GET: detail with items + receipts. PATCH: `{customStatusId}` only — the Custom Status tag, the one editable field on an otherwise-immutable invoice |
| GET/POST | `/api/sales/quotations` | A · `sales.quotation` | list / create (no GL/stock) |
| GET/POST | `/api/sales/orders` | A · `sales.sales_order` | list / create (no GL/stock) |
| POST | `/api/sales/docs/[id]/convert` | A · `sales.sales_invoice` create | quotation→order→invoice prefill |
| GET/POST | `/api/sales/receipts` | A · `sales.receipt` | list / create (Dr cash / Cr customer; updates invoice status) |
| GET/POST | `/api/sales/credit-notes` | A · `sales.credit_note` | list / create (stock IN + reverse GL + reverse COGS; capped at invoice value) |
| POST | `/api/purchase/calc` | A · `purchase.purchase_invoice` read | preview totals (excise/custom duty capitalized) |
| GET/POST | `/api/purchase/orders` | A · `purchase.purchase_order` | list / create (no GL/stock) |
| GET/POST | `/api/purchase/invoices` | A · `purchase.purchase_invoice` | list / create (posts GL + stock at landed cost; **financial fields are immutable, no edit/delete**); POST body's optional `customFields` (module `PURCHASE_INVOICE`) saved at creation only |
| GET/PATCH | `/api/purchase/invoices/[id]` | A · `purchase.purchase_invoice` read/update | GET: detail with items + payments. PATCH: `{customStatusId}` only — the Custom Status tag |
| POST | `/api/purchase/docs/[id]/convert` | A · `purchase.purchase_invoice` create | purchase order → invoice prefill |
| GET/POST | `/api/purchase/payments` | A · `purchase.payment` | list / create (Dr supplier / Cr cash-bank; updates invoice status) |
| GET/POST | `/api/purchase/debit-notes` | A · `purchase.debit_notes` | list / create (stock OUT + reverse GL at the debit note's own valuation; capped at invoice value) |
| GET | `/api/system/info` | A · `system.system_info` read | process/host/DB latency/network + per-module record counts |
| POST | `/api/system/query` | A · `system.database_console` read | read-only diagnostic SQL (SELECT/WITH only, 200-row cap, audited) |
| GET/POST | `/api/assets` | A · `fixed_assets.asset_register` | list / create (posts Dr Asset-at-cost / Cr Supplier-or-Cash-Bank) |
| GET | `/api/assets/[id]` | A · `fixed_assets.asset_register` read | detail incl. full depreciation-entry history |
| POST | `/api/assets/[id]/dispose` | A · `fixed_assets.asset_register` update | catch-up depreciation + Dr AccumDep/Proceeds/Loss / Cr Asset+Gain |
| GET/POST | `/api/assets/depreciation-runs` | A · `fixed_assets.depreciation` | list runs / post a batch run (one voucher, grouped per category) |
| GET/POST | `/api/manufacturing/boms` | A · `manufacturing.bill_of_materials` | list / create (validates output is FINISHED_GOODS, components are GOODS) |
| GET | `/api/manufacturing/boms/[id]` | A · `manufacturing.bill_of_materials` read | detail with components |
| GET/POST | `/api/manufacturing/production-orders` | A · `manufacturing.production_order` | list / run (consumes components at weighted-avg cost, posts Dr WIP→Finished / Cr Raw Material+Labor) |
| GET | `/api/manufacturing/production-orders/[id]` | A · `manufacturing.production_order` read | detail with components consumed |
| GET/POST | `/api/workshop/technicians` | A · `workshop.technician` | list / create |
| PATCH | `/api/workshop/technicians/[id]` | A · `workshop.technician` update | edit / deactivate |
| GET/POST | `/api/workshop/job-cards` | A · `workshop.job_card` | list / open (no GL/stock — a working document); POST body's optional `customFields` (module `JOB_CARD`) saved alongside, shown in the detail modal |
| GET | `/api/workshop/job-cards/[id]` | A · `workshop.job_card` read | detail with intake-estimate items |
| POST | `/api/workshop/job-cards/[id]/bill` | A · `workshop.job_card` update | completes the job by calling Sales' `createInvoice()` directly |
| POST | `/api/workshop/job-cards/[id]/cancel` | A · `workshop.job_card` update | cancels an OPEN job card (no GL impact ever existed) |
| GET | `/api/reports/profit-loss` | A · `reports.accounting_reports` read | `?from&to`; income vs expense by account head |
| GET | `/api/reports/balance-sheet` | A · `reports.accounting_reports` read | `?asOf`; assets vs liabilities+equity+current-year-profit |
| GET | `/api/reports/day-book` | A · `reports.accounting_reports` read | `?date`; every voucher posted that day |
| GET | `/api/reports/vat-return` | A · `reports.tax_reports` read | `?from&to`; output/input VAT + taxable sales/purchase net of returns |
| GET | `/api/reports/aging/receivable` | A · `reports.receivable_reports` read | `?asOf`; outstanding Sales Invoices net of Credit Notes, bucketed |
| GET | `/api/reports/aging/payable` | A · `reports.payable_reports` read | `?asOf`; outstanding Purchase Invoices net of Debit Notes, bucketed |
| GET | `/api/reports/transaction-list` | A · `reports.accounting_reports` read | `?from&to&ledgerId&page`; every posted GL line, paginated |
| GET | `/api/reports/general-ledger-summary` | A · `reports.accounting_reports` read | `?from&to`; per-ledger opening/debit/credit/closing |
| GET | `/api/reports/voucher-report` | A · `reports.accounting_reports` read | `?type=JOURNAL\|CONTRA&from&to`; read-only voucher report (no Vouchers-module permission needed) |
| GET | `/api/reports/sales-report` | A · `reports.sales_reports` read | `?type=INVOICE\|CREDIT_NOTE&from&to` |
| GET | `/api/reports/sales-profit` | A · `reports.sales_reports` read | `?from&to`; per-invoice gross profit from the COGS voucher already posted at sale time |
| GET | `/api/reports/purchase-report` | A · `reports.purchase_reports` read | `?type=INVOICE\|DEBIT_NOTE&from&to` |
| GET | `/api/reports/receipts` | A · `reports.sales_reports` read | `?from&to` |
| GET | `/api/reports/payments` | A · `reports.purchase_reports` read | `?from&to` |
| GET | `/api/reports/monthly-tax-summary` | A · `reports.tax_reports` read | `?from&to`; output/input VAT bucketed by calendar month |
| GET | `/api/reports/activity-log` | A · `reports.system_reports` read | `?from&to&userId&action&page`; reads `AuditLog` |

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
