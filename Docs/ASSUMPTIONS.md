# ASSUMPTIONS

Anything **not** directly verified against the reference application.

| # | Area | Assumption | Basis | Verify by | Risk if wrong |
|---|------|-----------|-------|-----------|---------------|
| A1 | Stack | Clone uses Next.js App Router + Prisma + PostgreSQL regardless of reference's Django/Pages-Router stack | client decision | n/a | none |
| A2 | Auth | JWT in **httpOnly** cookies with rotating refresh (reference exposes tokens to JS — we harden) | brief §14 | n/a | low |
| A3 | VAT | Standard Nepal VAT **13%** + 0% exempt. `nonTaxable` products excluded from VAT base; taxable products carry `taxType` inclusive/exclusive | **CONFIRMED**: product form has Tax Type = Inclusive/Exclusive + Non-taxable flag; Settings›Tax is a rate list "published by IRD" | capture seeded tax rows + a real invoice calc | med — rate list configurable |
| A4 | Discount | Invoice-level discount amount (Rs) reduces the **taxable** base before VAT; also per-line Discount column | reference has both a line `Discount` col and an invoice `Discount Rs.` field above Non-taxable/Taxable/VAT | `POST /invoices/` payload; one real invoice | **high** — apportionment rule (taxable-only vs pro-rata) unconfirmed |
| A5 | Tenancy | Clone = one `Company` per deployment; schema keeps `companyId` on all tables. Reference uses **schema-per-tenant** (django-tenants) + nestable companies | **CONFIRMED** `/companies/` shows `schema_name`, `parent_company`, `is_parent` | client: do we need true multi-tenant? | med — our `companyId` approach is simpler & sufficient unless client wants schema isolation |
| A6 | Numbers | Money `Decimal(18,2)`, qty `Decimal(18,3)`; unit `acceptFraction` controls qty fractions | reference `unit.accept_fraction` bool | — | low |
| A7 | User types | `userType` options: **Admin, Manager, Accountant, Customer** (vendor Software Spec §5.1 / §8). `ADMIN` = wildcard; others use per-module role permissions. Reference roles (Django groups): Admin/Cashier/Retailer/Storekeeper | **RESOLVED** — `Docs/vendor/SOFTWARE-SPEC.txt` | — | low |
| A8 | Soft delete | Records archived (`deletedAt`), not hard-deleted. Reference has `reserved:true` on system COA rows (undeletable) | brief §8; reference `reserved` flag | try delete in reference | low |
| A9 | Menu routes | Some submenu routes inferred from URL patterns | observed siblings | visit each | low — `MenuItem.route` is data |
| A10 | Permission model | Clone RBAC = per-module CRUD matrix (our `PermissionModule`), mapping the reference's Django model perms to nav-grouped UI modules | Settings › User & Permissions matrix + `/users/permissions/` | diff `/users/permissions/my/` shape | low |
| A11 | Fiscal year | BS "2083-84" = AD 2026-07-17 → 2027-07-16; API queries use AD dates, UI shows BS | reference `fiscal_year` localStorage + `from_date` params | — | low — need a BS⇆AD date lib (`nepali-date-converter`) |
| A12 | Chart of Accounts | Clone seeds an NFRS COA (~30 heads / ~106 groups / ~185 ledgers) mirroring the reference; `reserved` accounts undeletable | reference COA fully readable via `/ledgers/*` | scrape all 3 levels when building Accounts module | med — report accuracy depends on it |
| A13 | Scope | Store Builder + Fixed Assets + CRM + Budget + industry verticals (workshop/restaurant/fuel/press) all exist in the reference backend | **CONFIRMED** via 76-model list | client: which are in scope, and in what order? | — |
| A14 | Dark mode | Back-office light-only | reference | — | low |
| A15 | Invoice immutability | **CONFIRMED (vendor doc `Docs/vendor/INVOICE-IMMUTABILITY.txt`):** once created, an invoice is a **read-only immutable record** — DB constraints block UPDATE/DELETE on invoice rows; no user has edit/delete privilege; every attempt is audit-logged. Corrections happen only via **Credit Note (sales return)** / **Debit Note (purchase return)** or a cancellation reversal voucher. Numbering: sequential, gap-free, per fiscal-year, per type (`JV-2083/84-0001` style already built for vouchers). | vendor doc | Settings › Invoice Setting for exact number format | resolved — enforce in the Sales/Purchase modules |
| A16 | CBMS/IRD sync | Real-time invoice push to IRD CBMS is optional (`Sync With IRD` toggle) and out of clone scope v1 (stub the integration point) | Company Info toggles | client | med — integration seam must exist |
| A17 | GL posting | Every invoice/receipt/payment/voucher posts balanced GL entries (`Voucher`+`VoucherLine`); reports read from GL, not from documents | standard accounting; reference `/slips/` + `/reports/trail-balance/` join to ledgers | inspect a posted invoice's ledger effect | **high** — core architecture |

_Never mark a behaviour "verified" unless actually observed in the reference app._
