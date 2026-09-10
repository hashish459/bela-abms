# DISCOVERY LOG — reference application

Notes from inspecting **https://bela.nepalebilling.com** (authenticated, Admin account).
Structured conclusions in `INVENTORY.md`; API detail in `REFERENCE-API-MAP.md`;
domain model in `DATABASE.md`. **No credentials or tokens recorded here.**

---

## SESSION 3 ADDENDUM (2026-09-11) — deep API / domain dive

Captured live XHR traffic (patched `fetch`/`XMLHttpRequest`) while driving the app.

### Backend architecture
- **Django + Django REST Framework**, **django-tenants** (schema-per-company on PostgreSQL).
  `GET /companies/` → `{id, name, schema_name:"bela", domain:"bela.api.nepalebilling.com",
  parent_company, is_parent, is_current, branch_count}`. Companies can nest (`parent_company`).
- Auth **SimpleJWT** — `access_token` + `refresh_token` cookies (readable by JS in the reference;
  our clone uses httpOnly). Claims: `user_id`, `user_type` (`AD`).
- **Three resource families:**
  `/invoices/` (trade docs, `invoice_type` SA/PU/QU/SO/PO/PF) ·
  `/slips/` (accounting vouchers, `slip_type` JO/CO/ST) ·
  `/ledgers/` (3-level chart of accounts: account-head → group-head → general-ledger).
- RBAC backend = **Django groups + model permissions** (`add_/change_/delete_/view_<model>`,
  301 perms over 76 models). Seeded groups: **Admin, Cashier, Retailer, Storekeeper**.
  The UI "Permissions Matrix" maps these to friendly module names grouped by nav.
- **76 backend models** — full list in `DATABASE.md`. Notable: a full **Fixed Assets**
  subsystem (asset, asset life/depreciation, capitalization, sell/lost-stolen-broken),
  **CRM** (client/partner/contract/follow-up/interaction/target/visit-history/location-point),
  **manufacturing** (material bill = BOM, manufacture-demolish), and industry verticals
  **workshop job card / technician**, **restaurant table**, **token entry** (fuel), **paper
  roll / printing cost register** (press) — mostly not surfaced in this tenant's nav.

### Chart of Accounts (NFRS, pre-seeded, `reserved:true` = system)
3 levels, codes `HEAD` → `HEAD-NN` → `HEAD-NN-NNNN`:
- **Account Head** (L1): 185 GL accounts roll up through 106 group heads to ~30 account heads.
  Enums: `account_type` AS/LI/EQ/IN/EX · `current_account_type` CU/NC/O · `financial_account_type` FI/NF/O.
  Heads seen: ADE, CWIP, CCE, COS, DTA/DTE/DTL/DTOCI, FNI, FNE, ITE, ITP, IAS, PPE, R&S, TRR, TRP.
- **Contacts** = general-ledger accounts under TRR (customers) / TRP (suppliers). Contact form
  adds: Parent Ledger, PAN, IEC No., GSTIN, Credit Limit, Bank Name/Acct, Opening Balance DR/CR.
- **Cash & bank / payment modes** = GL accounts under CCE-01..05 (`/ledgers/general-ledger/bank/`).
  Payment modes seen: Credit, Cash In Hand, Bank Account, **eSewa**, **Khalti**, **POS**.

### Company Info (Settings) — IRD compliance
Legal name, PAN, **Exim Code**, **CBMS Username / CBMS Password** (IRD Central Billing
Monitoring System), **Registered with VAT**, **Separate purchase/sales tax**, **Sync With IRD**
(real-time invoice push to tax authority). Logo / Stamp / Payment QR / Signature uploads.
This tenant: "Bela Nepal Industries", PAN 605919129, VAT-registered, separate-tax off.

### Tax
`Settings › Tax` — configurable list "published by IRD": `Name`, `Rate (in %)`, `No Tax` flag.
Nepal standard is **VAT 13%** + 0% exempt. Product carries `taxType` (inclusive/exclusive) +
`nonTaxable`. (Exact seeded rows not captured — verify when building.)

### Inventory
Units have `accept_fraction` (pcs=false, kg/lt=true). Categories self-nest. Warehouses belong
to a branch ("Default Warehouse" / "Main Branch"). Products: `product_type` GD/SR/EX, up to
3 unit levels with conversions, batches, 9 optional serialised-item fields.

### Custom fields
Attachable to 18 doc types: Quick Receipt, Sales Invoice, Customer, Supplier, Supplier Payment,
Quotation, Purchase Order, Sales Order, Purchase Voucher, Credit Note, Debit Note, Expense,
Payment, Journal Voucher, Chalani, Product, Sales Table Columns, Purchase Table Columns.
→ implies a "Quick Receipt" (POS) flow distinct from full Sales Invoice.

### Reports
`/reports/<name>/` with rich Django-lookup filters. Trial Balance row carries opening / period
dr / period cr / closing + balance_type, joined up the account hierarchy. Dashboard widgets
each hit a `/reports/*/dashboard/` endpoint (no fake numbers — all computed server-side).

### Still open (capture when building each module)
`POST` payloads for invoice/slip/receipt/payment; VAT+discount apportionment math;
invoice-number format & CBMS sync protocol; `/users/permissions/my/` shape; per-report columns;
Fixed-Assets & CRM & Budget & Store endpoints; Quick Receipt flow.

---

## Environment / stack (observed)

| Item | Value |
|------|-------|
| Frontend | **Next.js (Pages Router)** SPA. `_next/data/<buildId>/…json`, `pages/dashboard/**`. Build id `ph_K-SjxpYxoMZM8Ja6TS`. |
| Frontend host | `https://bela.nepalebilling.com` (tenant subdomain `bela`) |
| Tenant API | `https://bela.api.nepalebilling.com/` — per-company subdomain API |
| Shared API | `https://api.nepalebilling.com/` (e.g. `/configurations/fiscal-year/`) |
| API style | **Django REST Framework** — trailing slashes, `?limit=&offset=` pagination, `/users/group/` |
| Auth | **JWT (SimpleJWT)** — `access_token` + `refresh_token` cookies. JWT claims: `user_id` (uuid), `user_type` (`AD`=Admin), `exp`. access ≈ 12h, refresh ≈ 7d. Cookies readable by JS in the reference (our clone will use httpOnly). |
| Media | `http://bela.api.nepalebilling.com/media/...` served through Next image proxy |
| CSS | **Tailwind CSS**. `bg-accent-color`, `bg-background`, tokens below |
| Multi-tenancy | **Company → Branch**. "Add Company" (name, **subdomain**, address, "allow this company to create its own branches"). "Add Branch" (name, address). |
| Localization | Nepali fiscal year (`2083-84`, BS dates `YYYY-MM-DD` Bikram Sambat), Nepali month names (Baisakh…Chaitra), currency `Rs.` (NPR) |

### API endpoints seen (partial)
```
GET  /users/profile/me/
GET  /users/permissions/my/           (current user's effective permissions)
GET  /users/permissions/
GET  /users/group/                    (roles/groups)
GET  /users/                          list users
GET  /users/<uuid>/
GET  /configurations/company-info/
GET  /configurations/fiscal-year/     (shared api host)
GET  /activities/notification/?limit=10&offset=0
GET  /activities/unread-count/
```

---

## Design tokens (observed)

| Token | Value |
|-------|-------|
| Accent / primary | `#00A8E8` (`rgb(0,168,232)`, class `bg-accent-color`) |
| Accent tint (selected row) | `rgba(0,168,232,0.05)` |
| App background | `#F0F0F0` (`bg-background`) |
| Surface | `#FFFFFF` |
| Text primary | `#00171F` (`rgb(0,23,31)` near-black teal) |
| Tooltip bg | `#374151` (gray-700), white text |
| Body font | **DM Sans**, 16px base |
| Other fonts loaded | Inter, Playfair Display, Kadwa |
| Radius | 8px (buttons), `rounded-lg` / `rounded-xl` common |

---

## Unauthenticated routes (marketing)

`/`, `/features`, `/industries`, `/blog`, `/api-integration`, `/plans`, `/contact`, `/faq`,
`/login` (email + password, "Forgot Password?"), `/signup`, `/reset-password`.

---

## Authenticated app shell

- Route base: **`/dashboard`**. Login redirects here.
- **Header:** hamburger (mobile), global **Search**, **Guide/Tour** play button, **fiscal-year switcher** (`2083-84`), notification bell (unread count), profile avatar menu.
- **Sidebar (primary nav) — 13 items** (see tree below).
- **Fiscal year** persisted in `localStorage.fiscal_year` = `{id,name,start_date,end_date,active}`.
- Content header shows **breadcrumb** (`Sales > Invoice`) + page title + a **secondary tab strip** (submenu) under it.

---

## PRIMARY NAVIGATION TREE (observed)

```
Dashboard        /dashboard
Sales            /dashboard/sales/invoice
  Quotation                 /dashboard/sales/quotation
  Proforma Invoice          /dashboard/sales/proforma-invoice   (tab; route inferred)
  Sales order               /dashboard/sales/sales-order
  Sales Invoice             /dashboard/sales/invoice
  Receipts                  /dashboard/sales/receipt
  (related: Chalani, Cheque, Credit note, Receivable amount, Printing Cost Register)
Purchase         /dashboard/purchase/purchase-bills
  Purchase order            /dashboard/purchase/purchase-order   (tab)
  Purchase Invoice          /dashboard/purchase/purchase-bills
  (related: Expenses, Debit notes, Payments, Payable amount, Goods Received, Imports,
            Supplier payment /dashboard/purchase/supplier-payment)
Inventory        /dashboard/inventory/products
  Product category          /dashboard/inventory/product-category (tab)
  Products                  /dashboard/inventory/products
  (related: Units of measurement, Warehouse transfer, Inventory adjustment,
            Warehouse, Inventory Transfer)  |  product kinds: Goods / Services / Expenses
CRM              /dashboard/crm
  Dashboard, Clients, Partners, Follow Ups, Reports   (+ "User Filter" permission)
Vouchers         /dashboard/vouchers/journal-voucher
  Journal Voucher, Contra Voucher, Stock Journal
Accounts         /dashboard/accounts/charts-of-accounts
  Charts of accounts (Account /…/charts-of-accounts/account, Grouping Head)
  Cash & Bank account, Payment QR Gallery, Contacts, Balance Confirmation
Budget           /dashboard/budget/budget-heading
  Budget Heading, Budget, Allocation, Fund
Token            /dashboard/token            (fuel/petrol token issuance)
Documents        /dashboard/documents/document   (folders + file upload; types: Images/PDF/Other)
Reports          /dashboard/reports          (report catalogue — see below)
Store Builder    /dashboard/store-builder/theme
  Theme Settings, Hero Sliders, Offer Ads, Reviews, Sales Orders, Store Design
Settings         /dashboard/settings/signin&security   (see below)
Notification & Reminder  (permission group; dashboard widget + bell)
```

### Dashboard quick actions (chips)
Quotation · Sales order · Sales Invoice · Sales report
(`/dashboard/reports/sale-report/saleReport`) · Purchase Voucher · Purchase Report
(`/dashboard/reports/report-purchase/reportPurchase`) · Receipts · Payment
(`/dashboard/purchase/supplier-payment`)

### Dashboard widgets
- Date filter (Today / …) driving KPI cards
- KPI radio cards: **Sales · Purchase · Payment · Receipt** (each vs "Yesterday")
- **Sales by Month** bar chart (Nepali months)
- **Reminder** widget: Add New / History; form = Title, Description, Remind at (BS date), Time
- **Yearly Data** toggle
- **Cash & Bank**: Cash in hand, Bank balance, Total
- **Cash flow**: Cash-in-flow, Cash-out-flow
- **Outstanding**: Receivables, Payables
- **Top 5**: Customers / Suppliers / Receivable / Payable / Fast-moving / Slow-moving / Non-moving item
  (table: Customer Full Name, Phone No., Email, Amount)

---

## MODULE DETAIL (observed forms & tables)

### Sales › Sales Invoice  (`/dashboard/sales/invoice`)
- **Form "New Invoice":** Account name* (customer picker), PAN, Delivery date, Payment mode*,
  Credit days limit (days), Invoice reference no.
- **Line grid:** Product (code/product search) · Batch · Warehouse · H.S Code · Qty · Rate ·
  Discount · Amount. "Add code or product".
- **Note** ("*This will appear on print"), **Custom Fields**.
- **Totals (server-authoritative):** Total → Discount (Rs) → Non-taxable Total → Taxable Total
  → VAT → Grand Total.
- **Actions:** Save · Save & Print.
- **Related docs from an invoice:** Chalani · Receipt · Cheque · Credit note · Receivable amount
  · Printing Cost Register.
- **List columns:** Date · H.S Code · Invoice No. · Reference · Customer · Taxable Amount ·
  Non-Taxable Amount · Vat · Amount. Filters: All Users, All (status). Actions: Print, Export.
  Pagination size 10.
- Sales Order has **"Convert to Invoice"**.

### Purchase › Purchase Invoice  (`/dashboard/purchase/purchase-bills`)
- **Form:** Supplier name* · PAN · Supplier Invoice Number* · Invoice date* · Delivery date ·
  Reference · Payment mode*.
- **Line grid:** Item/product · Batch · H.S Code · Qty · Rate · **Excise duty** · **Custom duty**
  · Discount · Tax · Amount.
- **Totals:** Total · Total Excise Duty · Total Custom Duty · Discount · Non-taxable Total ·
  Taxable Total · VAT · Grand Total.
- **Related:** Expenses · Debit notes · Payments · Payable amount · Goods Received · Imports.
- **List columns:** Date · H.S Code · Invoice No. · Reference · Supplier · Taxable · Non-Taxable
  · Vat · Amount. Print / Export.

### Inventory › Products  (`/dashboard/inventory/products`)
- Product kinds: **Goods / Services / Expenses**.
- **General Info:** Name* · Category* · HSN Code · Code/SKU* · Re-order point (in unit) · Description.
- **Units:** Unit* · Sub-unit · Unit Conversion · Tertiary unit · Tertiary Conversion (per sub-unit).
- **Inventory:** Opening quantity (in unit) · Warehouse* · Purchase price (Rs.) · Selling price (Rs.).
- **Attributes:** Size · Color · Flavour · DFTQC No. · Made & Imported From · Expiry Date.
- **Tax:** Tax Type (picker) · Non-taxable flag.
- Bulk product upload (Excel template); "Update Prices" bulk.
- **List:** Code|SKU · Name · Category · Quantity In Hand. Filter by category / kind.

### Vouchers › Journal Voucher  (`/dashboard/vouchers/journal-voucher`)
- Date* · grid: Particulars (account) · Debit · Credit · Narration.
- "Add Account" rows. **Total Debit / Total Credit / Difference (must be 0)**. Global Narration.
- Contra Voucher, Stock Journal are sibling voucher types.

### Accounts › Charts of Accounts  (`/dashboard/accounts/charts-of-accounts`)
- **NFRS-based COA** pre-seeded (~190 accounts, 19 pages).
- Columns: Account Code · Account Name (General Ledger) · Grouping Head · Financial Heading ·
  Non/Financial · Non/Current · Account Type (Assets / Equity / Liabilities / Income / Expense).
- Codes like `PPE-01-0002` (Property Plant & Equipment), `IAS-01-0002` (Intangibles),
  `R&S-01-0001` (Reserve & Surplus).
- **Add Account form:** Account Name* · Group Head* · Opening Balance + DR/CR · Pan Number · Description.
- Sub-tabs: Account, Grouping Head. Section tabs: Charts of accounts · Cash & Bank account ·
  Payment QR Gallery · Contacts · Balance Confirmation.

### Budget  (`/dashboard/budget/budget-heading`)
- **Add budget heading:** Heading Name · Code · Parent Heading (Top level) · Source Type
  (Manual | Chart Of Account → General Ledger) · Description · Restriction Note ·
  Restricted heading flag · Active flag.
- Sub-modules: Budget Heading · Budget · Allocation · Fund. (NGO/project-fund oriented —
  "donor utilization", "restricted funds" per Budget vs Expense report.)

### Token  (`/dashboard/token`)
- Fuel dealer feature. Token no* · Issued date* · Supplier name* · Vehicle no* ·
  grid: Product · Token Qty · Fuel Dispensed · Rate · Amount. Save & Print.
- List: Date · Token · Supplier Name · Qty · Total Amount.

### Documents  (`/dashboard/documents/document`)
- Folder tree + file upload. Filters: All file types / Images / PDF / Other. Sort by date/name.
- New Folder, Upload File, Rename Folder.

### CRM  (`/dashboard/crm`)
- Dashboard KPIs: Total Clients · Partners · Calls Today · Today's Follow-ups · Overdue ·
  Converted · Conversion Rate.
- Sections: Clients · Partners · Follow Ups · Reports. Per-user filtering.

### Store Builder  (`/dashboard/store-builder/theme`)
- Storefront (e-commerce) config: design templates (Midnight Luxe, Legacy Luxe, Dropshipping,
  Minimalist, Star Light, Radiant, Kalyaraa), Light/Dark palettes (Background/Surface/Accent/
  Text Primary/Text Secondary), heading+body font pickers, dark-mode switch toggle.
- Sections: Theme Settings · Hero Sliders · Offer Ads · Reviews · Sales Orders · Store Design.

### Reports catalogue  (`/dashboard/reports`)
- **Accounting:** Transaction List · General Ledger Summary · Trial Balance · Contra Report ·
  Statement of Profit & Loss · Day Book · Ledger Report · Journal Report ·
  Statement of Financial Position · Statement of Other Comprehensive Income.
- **Sales:** Sales Report · Sales Profit Report · Sales Return Report · Receipt Report ·
  Sales Report (Tax) · Sales Return Report (Tax).
- **Purchase:** Purchase Report · Purchase Return Report · Payment Report · Purchase Report (Tax)
  · Purchase Return Report (Tax).
- **Payable & Receivable:** Aging Report · Customer Aging Report.
- **Inventory:** Stock Summary · Expiry Management · Batch Wise Stock Summary.
- **System:** Activity Log.
- **Tax:** Annex 13 Report · Monthly Tax Summary · Annex 5 Materialised View Report · VAT Return.
- **Budget:** Budget vs Expense Report.
- "Favourites" pinning.

### Settings  (`/dashboard/settings/*`)
Signin & Security (change password) · Company Info · Backup Data · User & Permissions ·
Bill Footer · Bank Detail · Printing templates · Customer display · Fiscal year ·
Custom fields · Banks · Custom Status · Tax · Barcode · Invoice Setting ·
Invoice Import Setting · Tour.

---

## RBAC MODEL (from Settings › User & Permissions — authoritative)

- **Users** have: First/Last name, Email, Phone, **User Type**, and one-or-more **Roles** (free-text-named, e.g. Admin, Cashier, Retailer, Storekeeper, "Supervisor", "Team Lead").
  - Observed: Sarthak (Admin), Ashish (Admin), Zenith (Cashier + Retailer + Storekeeper).
- **Add Role → "Permissions Matrix": CRUD per UI module**, "grouped exactly like the application navigation". Actions per module: **CREATE · READ · UPDATE · DELETE · FULL ACCESS**. "Grant all" per group; "Expand/Collapse All".
- **Invite Users** flow (email invite).
- **Companies** tab under User & Permissions (multi-company). Branches per company.

### Permission module map (group → modules) — 15 groups, 78 modules
```
Dashboard (1):           Dashboard
Sales (10):              Sales Invoice, Quotation, Proforma Invoice, Sales Order, Chalani,
                         Receipt, Cheque, Credit Note, Receivable Amount, Printing Cost Register
Purchase (8):            Purchase Invoice, Purchase Order, Expenses, Debit Notes, Payment,
                         Payable Amount, Goods Received, Imports
Inventory (7):           Product / Item, Product Category, Units of Measurement,
                         Warehouse Transfer, Inventory Adjustment, Warehouse, Inventory Transfer
CRM (6):                 Dashboard, Clients, Partners, Follow Ups, Reports, User Filter
Vouchers (3):            Journal Voucher, Contra Voucher, Stock Journal
Accounts (4):            Charts of Accounts, Cash & Bank Account, Contacts, Balance Confirmation
Token (1):               Token
Documents (1):           Documents
Budget (4):              Budget Heading, Budget, Allocation, Fund
Reports (9):             Accounting Reports, Sales Reports, Purchase Reports, Receivable Reports,
                         Payable Reports, Tax Reports, Inventory Reports, System Reports, Budget Reports
Store Builder (4):       Theme Settings, Hero Sliders, Offer Ads, Reviews
Settings (16):           Signin & Security, Company Info, Backup Data, Users, Roles & Permissions,
                         Bill Footer, Bank Detail, Fiscal Year, Custom Fields, Banks, Custom Status,
                         Tax, Barcode, Invoice Setting, Invoice Import Setting, Tour
Notification & Reminder (2): Notification, Reminder
```

---

## Key workflows to reproduce (priority order)
1. **Auth**: JWT login → access/refresh → protected `/dashboard` → refresh rotation → logout.
2. **RBAC + data-driven nav**: role permission matrix → `/users/permissions/my/` → sidebar + route guards.
3. **Company/branch/fiscal-year context** switching.
4. **Sales invoice**: customer + line items (product→rate/tax/warehouse/batch) → server totals
   (discount, non-taxable vs taxable, VAT 13%, grand total) → save → ledger + stock-out + receivable.
5. **Purchase invoice**: + excise/custom duty → stock-in + payable.
6. **Journal voucher**: balanced double entry → GL.
7. **Inventory movement**: opening + purchase + sale + adjustment + transfer → Quantity In Hand.
8. **Reports**: Trial Balance, P&L, Statement of Financial Position, VAT Return, Stock Summary, Aging.

## Not yet inspected (TODO next discovery pass)
- Exact validation messages, modal behaviour, empty/error states per form.
- Proforma invoice / Chalani / Cheque / Credit note / Debit note forms.
- Contra voucher & Stock journal forms.
- CRM Client/Partner/Follow-up forms.
- Warehouse / Units / Inventory adjustment / transfer forms.
- Each report's filter panel + output columns + export formats.
- Settings sub-pages (Tax rates, Custom fields, Printing templates, Barcode, Bill footer, Invoice settings, Backup).
- Tax Type options; whether VAT is fixed 13% or configurable; invoice-number format & IRD/CBMS sync.
- Second lower-privilege role login to diff nav visibility.
