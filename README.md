# Bela — Accounting & Business Management System

An enterprise-grade, functionally-equivalent reimplementation of the authenticated web
application at **https://bela.nepalebilling.com** (Nepal E-Billing — IRD-verified VAT
billing + NFRS reporting).

This is **not** a visual mockup. The goal is a data-relational, secure, testable system
that could become a production replacement for the reference application.

## Repository layout

| Path | Purpose |
|------|---------|
| `Docs/InitialPrompt_clonning.docx` | Original client brief — do not edit |
| `Docs/*.md` | **Living architecture documentation** — read `Docs/PROGRESS.md` first every session |
| `app/` | The Next.js application (App Router + Prisma + PostgreSQL) |

> Windows filesystem is case-insensitive, so `Docs/` holds both the brief and the docs.

## Documentation index (`Docs/`)

| File | What it holds |
|------|---------------|
| [`Docs/PROGRESS.md`](Docs/PROGRESS.md) | **Session log + what's done / what's next.** Start here. |
| [`Docs/DISCOVERY-LOG.md`](Docs/DISCOVERY-LOG.md) | Raw notes from inspecting the reference app |
| [`Docs/REFERENCE-API-MAP.md`](Docs/REFERENCE-API-MAP.md) | Reverse-engineered reference API + enums |
| [`Docs/INVENTORY.md`](Docs/INVENTORY.md) | Complete module / page / action inventory |
| [`Docs/ARCHITECTURE.md`](Docs/ARCHITECTURE.md) | System, frontend, backend, auth, authz architecture |
| [`Docs/DATABASE.md`](Docs/DATABASE.md) | Entities, relationships, constraints, ER model |
| [`Docs/ROUTES.md`](Docs/ROUTES.md) | Every implemented route (UI + API) |
| [`Docs/WORKFLOWS.md`](Docs/WORKFLOWS.md) | Business workflows end-to-end |
| [`Docs/ASSUMPTIONS.md`](Docs/ASSUMPTIONS.md) | Anything not verified against the reference app |
| [`Docs/MASTER-PROMPT.md`](Docs/MASTER-PROMPT.md) | Refined enterprise replication prompt |
| [`Docs/vendor/`](Docs/vendor/) | Vendor-supplied docs (User Manual, Software Spec, invoice-immutability note) — extracted from `user_manuals/*.pdf` |

## Tech stack

- **Framework:** Next.js 16 (App Router, TypeScript, Turbopack)
- **ORM / DB:** Prisma 6 + PostgreSQL (`bela_abms`)
- **Auth:** JWT in httpOnly cookies (access 15m + rotating refresh 7d), bcrypt, server-side RBAC
- **UI:** React 19 + Tailwind CSS 4 (accent `#00A8E8`, DM Sans — matched to reference)
- **Testing:** Vitest (unit/integration) + Playwright (E2E workflows) — from Phase 5

## Run it

```bash
cd app
npm install
npm run db:migrate     # apply Prisma migrations to bela_abms
npm run db:seed        # reference permission/menu data + demo users
npm run dev            # http://localhost:3000
```

Demo logins (dev only): `admin@bela.local` / `cashier@bela.local` — password `password123`.

## Ground rules (from the client brief)

1. Inspect, don't guess. Document every assumption.
2. No fake data / fake CRUD / fake auth / hard-coded stats.
3. Business calculations are authoritative on the server only.
4. Multi-entity operations run in DB transactions.
5. Never trust IDs, roles, permissions, prices, totals, quantities from the browser.
6. Credentials for the reference app are **never** committed, logged, or hard-coded.
