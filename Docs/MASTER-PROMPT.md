# MASTER PROMPT — Enterprise Replication of Bela / Nepal E-Billing

Refined, self-contained prompt for any future session (or a fresh agent) picking up this
project. Paste it as the task, then follow `PROGRESS.md` for current state.

---

## Role

You are a senior enterprise team-in-one: software architect, reverse-engineering engineer,
full-stack developer, UI/UX engineer, database architect, security engineer, QA engineer.

## Objective

Produce a **functionally equivalent, enterprise-grade** reimplementation of the authenticated
web application at `https://bela.nepalebilling.com` (Nepal E-Billing — IRD-certified VAT
billing + NFRS reporting). Not a visual mockup. It must be capable of becoming the production
replacement: functionally equivalent + visually accurate + data-relational + secure +
maintainable + scalable + tested.

## Reference-app access

- The client logs in; you drive the browser to inspect. **You must never type passwords.**
- Credentials are never committed, logged, printed, or hard-coded anywhere.
- Inspect every menu, submenu, nested submenu, page, tab, modal, dropdown, form, table,
  search, filter, report, settings/user-management/config section, and every billing,
  inventory, customer, product, transaction, and reporting workflow the account can reach.
- For each screen determine: what data drives it, entities involved, relationships, what
  each click does, the logical API/DB operation, permissions required, validation, and
  success/failure behavior. Record in `docs/DISCOVERY-LOG.md` → structure into `docs/INVENTORY.md`.

## Tech stack (locked)

Next.js (App Router, TypeScript) · Prisma · PostgreSQL · Tailwind CSS · session-cookie auth
(argon2id) · Zod validation · Vitest + Playwright. App lives in `app/`.

## Architecture rules

1. **Navigation is data-driven & relational:** `Menu(id,parentId,title,slug,route,icon,order,
   visibility,permissionKey,moduleId,isExternal)` → `/api/menu` returns a permission-filtered
   tree → sidebar renders it. No hard-coded menus.
2. **RBAC:** `User → Role → Permission → Module → Action`; permission key `"<module>.<action>"`
   (view/create/update/delete/export/approve). Navigation visibility **and** backend
   authorization both derive from the same permission set. Never trust client-supplied
   ids/roles/permissions/prices/totals/quantities/identity.
3. **Layered backend:** route handler (HTTP + auth gate) → service (business logic,
   transactions) → repository (Prisma). Zod at the boundary.
4. **One authoritative implementation** of every business calculation, server-side. The
   client may preview; the server computes the stored values.
5. **Transactions** for any operation touching multiple entities (e.g. invoice = Invoice +
   InvoiceItems + StockMovement + Payment + JournalEntry + AuditLog).
6. **Relational DB, normalized.** No giant generic table, no whole-app JSON blob. Every
   business table has audit columns + soft delete. Only model entities the reference app
   actually supports.
7. **API grouped by domain** (`/api/auth`, `/api/users`, `/api/customers`, `/api/products`,
   `/api/invoices`, …). Every endpoint: validation, authN, authZ, error handling, consistent
   envelope `{ok,data}` / `{ok:false,error:{code,message,details?}}`, logging.
8. **Audit log** for login/logout/create/update/delete/approve/payment/invoice-change/
   permission-change/config-change: user, action, entity, entityId, timestamp, metadata.
9. **Security** (brief §23): input validation server-side, parameterized queries, CSRF token
   on mutations, IDOR checks in repositories, rate limiting + lockout, safe file uploads,
   no mass assignment, no stack traces to users, no secret exposure.
10. **UI is the reference app** — match colors, type, spacing, components, states (hover/
    active/focus/loading/empty/error), responsive behavior (desktop/laptop/tablet/mobile,
    no horizontal overflow). Do not redesign.

## Development order (do NOT clone in one pass)

1. **Inspect** — full sitemap/nav/modules/routes/forms/workflows/relationships/permissions/reports.
2. **Architecture** — system, ER model, API, routes, navigation, authorization, components.
3. **Foundation** — project structure, DB, auth, authZ, API envelope, error handling, logging, config.
4. **Core UI** — layout, header, sidebar, data-driven nav, responsive, design system.
5. **Modules** — one at a time: UI → API → DB → validation → authorization → tests.
6. **Cross-module workflows** — Customer→Invoice→Payment→Report; Product→Inventory→Invoice→Stock.
7. **Enterprise hardening** — security, audit, performance (indexes, no N+1, pagination, caching), monitoring hooks.
8. **QA** — full functional audit vs reference; `docs/INVENTORY.md` reference-vs-clone checklist.

## No fake anything

No fake data, APIs, dashboard stats, auth, permissions, CRUD, success responses, placeholder
buttons, disconnected menus, static search results, or mock calculations. Isolate any
temporary mock and remove it before the feature is "done".

## Every session

- Read `docs/PROGRESS.md` first; update it (session log + checklist) at the end.
- Keep `docs/` in sync: `ARCHITECTURE.md`, `ROUTES.md`, `DATABASE.md`, `WORKFLOWS.md`,
  `INVENTORY.md`, `ASSUMPTIONS.md`.
- After significant changes: typecheck, lint, test, build. App stays runnable throughout.
- Never mark something complete just because the page renders.

## Assumptions

If something can't be inspected: make the smallest reasonable assumption, keep the
architecture extensible, and log it in `docs/ASSUMPTIONS.md`. Never claim it was verified.

## Final deliverable

Implementation report: module inventory · navigation hierarchy · route inventory · DB
entities & relationships · API architecture · auth architecture · permission model · major
workflows · reports/print/export · security · performance · tests performed ·
reference-vs-clone discrepancies · assumptions · remaining work.
