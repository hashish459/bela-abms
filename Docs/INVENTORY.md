# APPLICATION INVENTORY

Structured inventory of the reference app. Detail/notes in `DISCOVERY-LOG.md`.
**Status:** `observed` = verified · `assumed` = inferred (`ASSUMPTIONS.md`) · `built` = in clone.

---

## 1. Navigation tree (13 primary items)

| # | Primary | Route | Submenu (observed) | Status |
|---|---------|-------|--------------------|--------|
| 1 | Dashboard | `/dashboard` | — | observed, **built (shell)** |
| 2 | Sales | `/dashboard/sales/invoice` | Quotation, Proforma Invoice, Sales Order, Sales Invoice, Receipts, Credit Note, Chalani, Cheque, Receivable Amount, Printing Cost Register | observed (menu built, pages stubbed) |
| 3 | Purchase | `/dashboard/purchase/purchase-bills` | Purchase Order, Purchase Invoice, Expenses, Debit Notes, Payments, Payable Amount, Goods Received, Imports | observed |
| 4 | Inventory | `/dashboard/inventory/products` | Product Category, Products, Units of Measurement, Warehouse, Warehouse Transfer, Inventory Adjustment, Inventory Transfer | observed |
| 5 | CRM | `/dashboard/crm` | Dashboard, Clients, Partners, Follow Ups, Reports | observed |
| 6 | Vouchers | `/dashboard/vouchers/journal-voucher` | Journal Voucher, Contra Voucher, Stock Journal | observed |
| 7 | Accounts | `/dashboard/accounts/charts-of-accounts` | Charts of Accounts, Cash & Bank Account, Contacts, Balance Confirmation (also: Payment QR Gallery, Grouping Head) | observed |
| 8 | Budget | `/dashboard/budget/budget-heading` | Budget Heading, Budget, Allocation, Fund | observed |
| 9 | Token | `/dashboard/token` | — (fuel token issuance) | observed |
| 10 | Documents | `/dashboard/documents/document` | — (folders + files) | observed |
| 11 | Reports | `/dashboard/reports` | catalogue of 35+ (see §4) | observed |
| 12 | Store Builder | `/dashboard/store-builder/theme` | Theme Settings, Hero Sliders, Offer Ads, Reviews, Sales Orders, Store Design | observed |
| 13 | Settings | `/dashboard/settings/*` | 17 sub-pages (see §5) | observed |

Header: global Search · Guide/Tour · Fiscal-year switcher · Notifications · Profile menu.

---

## 2. Permission modules — 15 groups (Settings › User & Permissions "Permissions Matrix")

Actions per module: **CREATE · READ · UPDATE · DELETE** (+ "Full Access" shortcut). "Grant all" per group.

| Group | Modules |
|-------|---------|
| Dashboard (1) | Dashboard |
| Sales (10) | Sales Invoice, Quotation, Proforma Invoice, Sales Order, Chalani, Receipt, Cheque, Credit Note, Receivable Amount, Printing Cost Register |
| Purchase (8) | Purchase Invoice, Purchase Order, Expenses, Debit Notes, Payment, Payable Amount, Goods Received, Imports |
| Inventory (7) | Product / Item, Product Category, Units of Measurement, Warehouse Transfer, Inventory Adjustment, Warehouse, Inventory Transfer |
| CRM (6) | Dashboard, Clients, Partners, Follow Ups, Reports, User Filter |
| Vouchers (3) | Journal Voucher, Contra Voucher, Stock Journal |
| Accounts (4) | Charts of Accounts, Cash & Bank Account, Contacts, Balance Confirmation |
| Token (1) | Token |
| Documents (1) | Documents |
| Budget (4) | Budget Heading, Budget, Allocation, Fund |
| Reports (9) | Accounting Reports, Sales Reports, Purchase Reports, Receivable Reports, Payable Reports, Tax Reports, Inventory Reports, System Reports, Budget Reports |
| Store Builder (4) | Theme Settings, Hero Sliders, Offer Ads, Reviews |
| Settings (16) | Signin & Security, Company Info, Backup Data, Users, Roles & Permissions, Bill Footer, Bank Detail, Fiscal Year, Custom Fields, Banks, Custom Status, Tax, Barcode, Invoice Setting, Invoice Import Setting, Tour |
| Notification & Reminder (2) | Notification, Reminder |

**Built:** seeded as `PermissionModule` (76 rows), key = `slug(group).slug(label)`. `Administrator`
role = all CRUD; `Cashier` role = read dashboard/sales/contacts/products + create sales invoice/
quotation/receipt.

Observed users: Sarthak (Admin), Ashish (Admin), Zenith (Cashier + Retailer + Storekeeper).

---

## 3. Key forms (observed) — see DISCOVERY-LOG for full field lists

| Form | Required fields | Line grid | Totals |
|------|-----------------|-----------|--------|
| Sales Invoice | Account name, Payment mode | Product, Batch, Warehouse, HS Code, Qty, Rate, Discount, Amount | Total → Discount → Non-taxable → Taxable → VAT → Grand Total |
| Purchase Invoice | Supplier, Supplier Inv No., Invoice date, Payment mode | +Excise duty, +Custom duty, +Tax per line | +Total Excise, +Total Custom |
| Product | Name, Category, Code/SKU, Unit, Warehouse | — | kinds: Goods/Service/Expense; taxType; sub/tertiary units |
| Journal Voucher | Date | Particulars(account), Debit, Credit, Narration | Total Dr = Total Cr (Difference 0) |
| Chart of Account | Account Name, Group Head | — | Opening Balance Dr/Cr |
| Budget Heading | — | — | Source: Manual \| Chart Of Account; restricted flag |

---

## 4. Reports catalogue (observed)
Accounting: Transaction List, General Ledger Summary, Trial Balance, Contra Report, P&L,
Day Book, Ledger Report, Journal Report, Statement of Financial Position, Statement of OCI.
Sales: Sales, Sales Profit, Sales Return, Receipt, Sales (Tax), Sales Return (Tax).
Purchase: Purchase, Purchase Return, Payment, Purchase (Tax), Purchase Return (Tax).
Payable/Receivable: Aging, Customer Aging.
Inventory: Stock Summary, Expiry Management, Batch Wise Stock Summary.
System: Activity Log. Tax: Annex 13, Monthly Tax Summary, Annex 5, VAT Return.
Budget: Budget vs Expense.

## 5. Settings sub-pages (observed)
Signin & Security · Company Info · Backup Data · User & Permissions (User / Roles & Permissions /
Companies / Invite Users) · Bill Footer · Bank Detail · Printing templates · Customer display ·
Fiscal year · Custom fields · Banks · Tax · Barcode · Invoice Setting · Invoice Import Setting · Tour.

---

## 6. Reference-vs-clone checklist

| Area | Reference | Clone |
|------|-----------|-------|
| Login | ✓ | ✅ (JWT httpOnly, throttle, audit) |
| Auth session / refresh / logout | ✓ | ✅ (rotating refresh) |
| Route guard | ✓ | ✅ (`src/proxy.ts`) |
| RBAC permission matrix | ✓ | ✅ (model + seed; **UI editor pending**) |
| Data-driven menu + submenus | ✓ | ✅ (`/api/menu`, permission-filtered) |
| App shell (sidebar/header/FY/bell/profile) | ✓ | ✅ (bell/search not wired to data) |
| Dashboard widgets/KPIs | ✓ | ⬜ (needs transaction modules) |
| Company / Branch / Fiscal year | ✓ | ✅ model + seed; ⬜ switcher UI |
| Forms / validation | ✓ | ⬜ |
| CRUD (any domain module) | ✓ | ⬜ |
| Search / filters / pagination | ✓ | ⬜ |
| Reports / print / export | ✓ | ⬜ |
| Inventory movement logic | ✓ | ⬜ |
| Billing calculation engine | ✓ | ⬜ |
| Responsive UI | ✓ | ✅ shell (per-module later) |
| Audit logging | ✓ | ✅ infra + login/logout; ⬜ domain events |

Do not mark complete because a page renders.
