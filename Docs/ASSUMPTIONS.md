# ASSUMPTIONS

Anything **not** directly verified against the reference application. Each assumption:
what we assumed, why, how to verify later, and how the architecture stays extensible if wrong.

| # | Area | Assumption | Basis | How to verify | Risk if wrong |
|---|------|-----------|-------|---------------|---------------|
| A1 | Stack | Reference app's own stack is irrelevant; clone uses Next.js + Prisma + PostgreSQL | Client decision | n/a | none |
| A2 | Auth | Session-cookie auth (not JWT) is acceptable for the clone | Enterprise default, brief says "improve security" | n/a | low — swap is isolated to `lib/auth` |
| A3 | Currency | Single currency NPR; VAT standard rate 13% | Nepal IRD billing domain | Check invoice form + settings in reference | medium — tax engine is configurable |
| A4 | Tenancy | Account is single-organization; multi-branch may exist | Not yet observed | Look for org/branch switcher after login | medium — `organizationId` column reserved |
| A5 | Numbers | Money as `Decimal(18,2)`; quantities `Decimal(18,3)` | Accounting precision | Inspect displayed precision in reference | low |
| A6 | Soft delete | Records archived, not hard-deleted | Brief §8, audit needs | Try delete in reference, see if recoverable | low |

_Add rows as discovery proceeds. Never mark a behavior "verified" unless actually observed._
