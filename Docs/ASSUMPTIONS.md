# ASSUMPTIONS

Anything **not** directly verified against the reference application.

| # | Area | Assumption | Basis | Verify by | Risk if wrong |
|---|------|-----------|-------|-----------|---------------|
| A1 | Stack | Clone uses Next.js App Router + Prisma + PostgreSQL regardless of reference's Django/Pages-Router stack | client decision | n/a | none |
| A2 | Auth | JWT in **httpOnly** cookies with rotating refresh (reference exposes tokens to JS — we harden) | brief §14 "improve security" | n/a | low, isolated to `lib/*` |
| A3 | VAT | Standard Nepal VAT **13%**, exclusive pricing, applied on taxable subtotal after discount | Nepal IRD norm; reference shows separate "Taxable Total" + "VAT" + "Grand Total" | inspect Sales Invoice calc with real line items; Settings › Tax | **high** — totals engine depends on it |
| A4 | Discount | Invoice-level discount amount (Rs), reduces taxable base | reference form shows single "Discount Rs." field below line grid | add line + discount in reference, read resulting Taxable Total | medium |
| A5 | Tenancy | One `Company` per deployment initially; schema keeps `companyId` everywhere for later multi-tenant | reference is multi-company (subdomain) but this account = 1 company | client answer | medium — columns already present |
| A6 | Numbers | Money `Decimal(18,2)`, qty `Decimal(18,3)` | accounting precision | inspect displayed precision | low |
| A7 | User types | `userType` free string; only `"ADMIN"` (ref JWT `AD`) grants wildcard; others rely on roles | ref JWT claim `user_type:"AD"`; "User Type*" select options not seen | open Add User form in reference | medium |
| A8 | Soft delete | Records archived (`deletedAt`), not hard-deleted | brief §8 + audit needs | try delete in reference, check recoverability | low |
| A9 | Menu routes | Submenu routes for unvisited items (Proforma, Chalani, Debit note, Budget sub-pages, Settings sub-pages, Store Builder sub-pages) inferred from URL patterns | observed sibling routes | visit each in reference | low — `MenuItem.route` is data, easily corrected |
| A10 | Permission keys | 76 modules named/grouped exactly as the reference "Permissions Matrix"; key = `slug(group).slug(label)` | Settings › User & Permissions "Expand All" capture | re-open matrix; diff | low |
| A11 | Fiscal year | BS "2083-84" ≈ AD 2026-07-17 → 2027-07-16 | `localStorage.fiscal_year` from reference (start 2026-07-17) | Settings › Fiscal year | low |
| A12 | Chart of Accounts | Clone will seed its own NFRS COA; reference's exact ~190-row list not yet copied | reference COA has 19 pages, NFRS codes (PPE-, IAS-, R&S-) | export/scrape from reference when building Accounts module | medium — report accuracy |
| A13 | Store Builder | E-commerce storefront module is **in scope** but lowest priority | it exists in reference nav | client answer (open question) | low |
| A14 | Dark mode | Back-office is light-only (reference "Default storefront mode is always Light") | reference screenshots all light | toggle any theme control in reference | low |

_Never mark a behaviour "verified" unless actually observed in the reference app._
