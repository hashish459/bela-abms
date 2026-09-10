# REFERENCE API MAP

Reverse-engineered from `bela.api.nepalebilling.com` (Django REST Framework) by capturing
XHR traffic while driving the authenticated reference app. **Not exhaustive** — endpoints
are added as modules are inspected. Our clone does NOT copy this URL scheme 1:1; it informs
our domain model and `/api/*` design (`Docs/ROUTES.md`).

## Conventions (observed)
- REST, trailing slash, JSON. Pagination: `?limit=&offset=` → `{count,next,previous,results}`.
- Filtering via Django-style lookups: `?invoice_date__gte=`, `?group_head__account_head__account_type=`, `?account_head__code__in=TRP,TRR,CCE`.
- Auth: `access_token` / `refresh_token` cookies (JWT, SimpleJWT). `user_id`, `user_type` in claims.
- Multi-tenant: **schema-per-company** (django-tenants). `/companies/` row has `schema_name`,
  `domain` (`<sub>.api.nepalebilling.com`), `parent_company`, `is_parent`, `is_current`.
- Dates in queries are **AD** (`from_date=2026-07-17`); UI shows **BS**.

## Identity / platform
| Endpoint | Purpose |
|----------|---------|
| `GET /users/profile/me/` | current user profile |
| `GET /users/permissions/my/` | current user's effective UI permissions |
| `GET /users/permissions/` | full Django permission list (301 = 76 models × 4 verbs) |
| `GET /users/group/` | roles (Django groups) + their permissions. Seeded: **Admin, Cashier, Retailer, Storekeeper** |
| `GET /users/` , `GET /users/<uuid>/` | user list / detail |
| `GET /companies/` | tenant companies (schema_name, domain, parent_company, is_parent, branch_count) |
| `GET /branches/` | branches for current company (empty ⇒ single implicit "Main Branch") |
| `GET /configurations/company-info/` | company profile + VAT/CBMS flags |
| `GET /configurations/fiscal-year/` | fiscal years (**served from shared `api.nepalebilling.com`**) |
| `GET /configurations/tax/` | tax rates ("published by IRD" list; Name + Rate% + No-Tax flag) |
| `GET /configurations/bank-information/` | master list of Nepali banks |
| `GET /configurations/bill-footer/<lang>/` | invoice footer text (`ru`, `en`) |
| `GET /custom-fields/custom-fields/list/` | user-defined fields, attachable to 18 doc types |
| `GET /activities/notification/?limit=&offset=` , `/activities/unread-count/` | header bell |
| `GET /activities/reminder/?reminder_date_time__gte=` | dashboard reminders |
| `GET /integration/...` (implied by `integration api key` model) | API keys |

## Accounts / Ledger  (3-level chart of accounts)
| Endpoint | Purpose |
|----------|---------|
| `GET /ledgers/account-head/?limit=99` | **level 1** — account heads (NFRS). Fields: `name, code (ADE/CCE/TRR/PPE/…), account_type, current_account_type, financial_account_type, reserved, active` |
| `GET /ledgers/group-head/?limit=99` | **level 2** — grouping heads. `name, code (ADE-01), account_head{...}, reserved, active` (count 106) |
| `GET /ledgers/general-ledger/?…` | **level 3** — GL accounts / ledgers (count 185). `name, code (CCE-01-0001), group_heading, financial_heading, non_financial, non_current, account_type` + party fields `pan_number, phone_number, alias_email, address, house_number, customer_type` |
| `GET /ledgers/general-ledger/?account_head__code__in=TRR` | customers (Trade Receivable) |
| `GET /ledgers/general-ledger/?account_head__code__in=TRP` | suppliers (Trade Payable) |
| `GET /ledgers/general-ledger/bank/?group_head__code=CCE-01,…,CCE-05` | cash/bank accounts (payment modes) |

### Account enums
| Field | Values |
|-------|--------|
| `account_type` | `AS` Assets · `LI` Liabilities · `EQ` Equity · `IN` Income · `EX` Expense |
| `current_account_type` | `CU` Current · `NC` Non-Current · `O` n/a (P&L) |
| `financial_account_type` | `FI` Financial · `NF` Non-Financial · `O` n/a |
| `balance_type` / `closing_balance_type` | `DR` · `CR` |
| account heads seen | ADE, CWIP, CCE, COS, DTA, DTE, DTL, DTOCI, FNI, FNE, ITE, ITP, IAS, PPE (property plant equip), R&S (reserve & surplus), TRR (trade receivable), TRP (trade payable) … |
| code format | `HEAD` → `HEAD-NN` (group) → `HEAD-NN-NNNN` (ledger) |

## Contacts (customers / suppliers = GL accounts)
`New Contact` form: type (Customer/Supplier), Name*, Phone, **Parent Ledger**, Address, PAN,
**IEC No.** (import-export code), **GSTIN** (India GST), Bank Name, Account Number, Email,
**Credit Limit**, Opening Balance + DR/CR. Bulk Excel import.

## Inventory
| Endpoint | Purpose |
|----------|---------|
| `GET /inventories/categories/?search=` | product categories (self-ref `sub_category`, `total_products`, image, active) |
| `GET /inventories/units/?search=` | units — `name, short_name, accept_fraction (bool), active`. Seeded: Unit, Kilogram, Gram, Liter, Sack, Carton, Millilitre, Packet |
| `GET /warehouses/?fields=id,name,branch_name` | warehouses (default: "Default Warehouse" / "Main Branch") |
| `GET /warehouses/product/?product_type=GD&…` | products. `product_type`: **GD** Goods · (SR Service · EX Expense) |
| `GET /warehouses/batch/?…` | product batches (line-item picker uses this) |
| `GET /warehouses/product-additional-field/` | serialised-item fields: Barcode, Engine No, Chassis No, Battery Serial No, Serial No, Color, Registration No, MFG Year, IMEI No (all toggleable) |

### Product form (Goods/Services/Expenses)
General: Name*, Category*, HSN Code, Code/SKU* (auto-`Gen`), Re-order point, Description.
Units: Unit*, Sub-unit, Unit Conversion, Tertiary unit, Tertiary Conversion.
Inventory: Opening quantity, Warehouse*, Purchase price, Selling price.
Attributes: Size, Color, Flavour, DFTQC No., Made & Imported From, Expiry Date.
Tax: **Tax Type = Tax Inclusive | Tax Exclusive**; **Non-taxable** checkbox.

## Sales & Purchase — unified `/invoices/`
| Endpoint | Purpose |
|----------|---------|
| `GET /invoices/?invoice_type=SA&…&ordering=-invoice_date` | **Sales invoices** |
| `GET /invoices/?invoice_type=PU&…` | **Purchase invoices** ("Purchase Voucher") |
| (by pattern) `invoice_type` also: `QU` quotation, `SO` sales order, `PO` purchase order, `PF`/`PI` proforma |
| list row fields | `id, invoice_date, hsn_code, invoice_number, reference_invoice, customer_ledger, taxable_amount, non_taxable_amount, vat_amount, grand_total` |
| detail route | `/dashboard/sales/invoice/details/<id>` |

### Sales Invoice form
Header: Account name* (customer ledger), PAN (auto), Delivery date, **Payment mode***
(Credit | cash/bank/eSewa/Khalti/POS ledger), Credit days limit, Invoice reference no.
Lines: Product · Batch · Warehouse · H.S Code · Qty · Rate · Discount · Amount.
Note (prints), Custom Fields.
Totals: Total → Discount (Rs, invoice-level) → Non-taxable Total → Taxable Total → VAT → Grand Total.
Actions: Save · Save & Print. From an invoice: Chalani, Receipt, Cheque, Credit note, Receivable amount, Printing Cost Register.

### Purchase Invoice form
Header: Supplier name*, PAN, **Supplier Invoice Number***, Invoice date*, Delivery date,
Reference, Payment mode*.
Lines: Item/product · Batch · H.S Code · Qty · Rate · **Excise duty** · **Custom duty** · Discount · Tax · Amount.
Totals: Total · Total Excise Duty · Total Custom Duty · Discount · Non-taxable · Taxable · VAT · Grand Total.
Related: Expenses, Debit notes, Payments, Payable amount, Goods Received, Imports.

## Vouchers — `/slips/`
| Endpoint | Purpose |
|----------|---------|
| `GET /slips/?slip_type=JO&slip_date__gte=&slip_date__lte=` | **Journal vouchers** (`slip_type`: JO · CO contra · ST stock journal) |
| Journal form | Date*, rows [Particulars(GL account) · Debit · Credit · Narration], must balance (ΣDr = ΣCr), global Narration |

## Reports — `/reports/*`
| Endpoint | Report |
|----------|--------|
| `GET /reports/trail-balance/?from_date&to_date&group_head__code&group_head__account_head__account_type&…current_account_type&…financial_account_type` | Trial Balance. Row: `name, code, ledger_debit_balance, ledger_credit_balance, opening_balance, balance_type, group_head, financial_head, non_financial_head, non_current, account_type, closing_balance_type, closing_amount` |
| `GET /reports/favorite-report/` | pinned reports |
| `GET /reports/ledger/dashboard/?from_date&to_date` | dashboard cash/bank |
| `GET /reports/voucher/dashboard/?…` | dashboard cash flow |
| `GET /reports/invoice/dashboard/` | dashboard sales/purchase KPIs |
| `GET /reports/sales-graph/dashboard?from_date&to_date` | "Sales by Month" |
| `GET /reports/top-customer/dashboard/` | Top-5 widget |
| report route pattern | `/dashboard/reports/<category>/<report>` e.g. `/dashboard/reports/accounting/trial-balance` |

## Not yet captured (next sessions, per module build)
- `POST /invoices/` payload (line + totals structure, how VAT/discount are sent vs computed)
- `POST /slips/` payload · `/receipts/` · `/payments/` · `/credit-note/` · `/debit-note/`
- `/goods-received/` · `/imports/` · `/warehouses/product/` POST · `/warehouses/adjustment/` · `/warehouses/transfer/`
- CRM `/crm/*`, Budget `/budget/*`, Token `/token/*` or `/slips/?slip_type=`, Documents
- Fixed Assets endpoints (`asset`, `capitalization`, `depreciation`/`asset life`, `sell asset`)
- `/users/permissions/my/` response shape (drives clone RBAC mapping)
- Report filter panels + column sets for each of the 35+ reports
