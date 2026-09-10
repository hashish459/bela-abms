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

---

## W3 — Double-entry GL posting  (CORE — every financial doc goes through this)

The reference keeps a real general ledger. Documents (`/invoices/`, receipts, payments) and
manual vouchers (`/slips/`) all **post balanced journal entries** to `Voucher`/`VoucherLine`
against `Ledger` accounts. Reports (`/reports/trail-balance/`, P&L, Balance Sheet) read the
**GL**, never the source documents.

```
postVoucher({ date, type, lines:[{ledgerId, debit, credit, narration}], sourceType, sourceId })
  invariant: Σ debit == Σ credit  (reject otherwise)
  → Voucher + VoucherLine rows
  → each line updates the running balance used by Trial Balance
  → AuditLog
```

Clone rule: a single `postVoucher()` service is the ONLY writer of GL entries. Modules call
it inside their transaction; they never write ledger balances directly.

## W4 — Sales Invoice  (customer → invoice → GL + stock + receivable)

```
Select customer (Ledger under TRR) → pull PAN, credit limit, current balance
Add line: pick Product/Batch → auto Warehouse, H.S Code, Rate (selling price), tax flag
  line.amount = qty × rate − line.discount
Invoice discount (Rs, header) applies to the TAXABLE base (apportionment rule: A4 — confirm)
Totals (server-authoritative):
  nonTaxableTotal = Σ line.amount where product.nonTaxable
  taxableBase     = Σ line.amount where taxable  − invoiceDiscount(taxable portion)
  vatAmount       = round(taxableBase × taxRate)          # taxRate = 0.13
  grandTotal      = nonTaxableTotal + taxableBase + vatAmount
  # tax-inclusive products: back out VAT from the rate first
Save →  (one DB transaction)
  Invoice + InvoiceItem[]                       (invoice_type = SA)
  StockMovement OUT per line (from batch/warehouse)   → reduces on-hand
  postVoucher(SALES):
     Dr  Customer (TRR)            grandTotal
     Cr  Sales Revenue (IN)        taxableBase + nonTaxableTotal
     Cr  VAT Payable (LI)          vatAmount
     Dr  COGS (EX)  / Cr Inventory (AS)   at cost      # perpetual inventory
  if payment mode ≠ Credit:  Receipt + postVoucher(Dr Cash/Bank, Cr Customer)
  invoice_number = next sequential for (company, fiscalYear, SA)   # gap-free, IRD
  AuditLog: CREATE invoice
  if company.syncWithIrd:  queue CBMS push (stubbed in v1 — A16)
Post-save actions available: Chalani · Receipt · Cheque · Credit Note · print/PDF
```

## W5 — Purchase Invoice  (supplier → bill → GL + stock + payable)

Like W4 but: supplier ledger (TRP), lines add **Excise duty** + **Custom duty** columns,
`Supplier Invoice Number` required, stock movement is **IN** at purchase cost, VAT is
**input VAT** (Dr VAT Receivable). Related: Goods Received (GRN), Import (LC/customs), Expense.

## W6 — Inventory / stock movement

`current on-hand = Σ StockMovement(product, warehouse, batch)`. Never a mutable field.
Sources: opening (product create), purchase IN, sale OUT, adjustment ±, warehouse transfer
(OUT+IN), branch transfer, sales/purchase return, manufacture (consume BOM → produce).
Reports: Stock Summary, Batch-wise, Expiry Management.

## W7 — Journal / Contra / Stock Voucher  (`/slips/`)

Manual entry. Journal = any Dr/Cr lines (must balance). Contra = cash↔bank only.
Stock Journal = non-financial stock adjustments. All go through `postVoucher()`.

## W8 — Reports

Each report = filter panel (fiscal-year date range in BS, branch, account-type filters,
search) → server aggregation over GL / StockMovement / Invoice → table → Print / PDF / Excel.
Dashboard widgets each call a dedicated `/reports/*/dashboard/` aggregate — no client math.
