# WORKFLOWS

End-to-end business workflows. Each: trigger → steps → entities touched → server rules →
transaction boundary → audit events → resulting UI updates.

> Status: **skeleton.** Real workflows filled from discovery. Templates below.

---

## W1 — Authentication (session 1)

```
/login → POST /api/auth/login
  ├─ validate email+password (Zod)
  ├─ rate-limit check (LoginAttempt by ip + email)
  ├─ verify passwordHash (argon2id)
  ├─ create Session (token hash, expiry), set httpOnly cookie
  ├─ AuditLog: LOGIN
  └─ redirect → /dashboard
Protected route access → middleware → requireSession → load user + permissions
/logout → revoke Session row + clear cookie → AuditLog: LOGOUT
```

## W2 — Navigation (session 1)

```
Authenticated layout → GET /api/menu
  ├─ load Menu tree
  ├─ filter nodes where permissionKey is null OR user has it
  ├─ return nested tree (parentId → children)
Sidebar renders tree; active state from current path; breadcrumbs from matched node.
```

## W3 — Generic CRUD (per module, from Phase 5)

```
Create:  form (RHF+Zod) → POST /api/<module> → requirePermission(<module>.create)
         → service validates → repository insert (tx if multi-entity) → AuditLog: CREATE
         → 201 + entity → UI: toast + list refresh
Read:    GET /api/<module>?page&pageSize&sort&q&<filters> → permission <module>.view
         → server-side pagination/sort/filter → list + meta
Update:  load → PATCH /api/<module>/:id → permission <module>.update → IDOR check
         → tx → AuditLog: UPDATE → UI refresh
Delete:  DELETE /api/<module>/:id → permission <module>.delete → confirm dialog
         → soft delete (deletedAt) or archive → AuditLog: DELETE
```

---

## W? — Billing / Invoice  (TBD from reference — CRITICAL)

Capture exactly:
- Customer selection → what customer data flows in (billing info, balance, price list)
- Line item: product select → auto-populate unit / price / tax
- Quantity × price → line subtotal; discount (line? invoice? % or amount?)
- Tax computation (VAT 13%? per-line or on subtotal? inclusive/exclusive?)
- Invoice subtotal → discount → taxable amount → VAT → grand total
- Payment (full/partial) → balance; invoice status transitions
- Invoice number generation (format, sequence, per-fiscal-year, IRD CBMS sync?)
- Effect on inventory (stock movement OUT) and ledger (journal entry)
- Print / PDF / export format
- **Transaction boundary:** Invoice + InvoiceItems + StockMovement + Payment + JournalEntry + AuditLog

## W? — Inventory / stock movement (TBD)

- Opening stock, purchase (IN), sale (OUT), adjustment, return
- Current stock = derived from movements (not a mutable field) — confirm
- Per branch/warehouse if present

## W? — Reports (TBD)

- Each report: inputs (date range, filters) → query → aggregation → render → export
