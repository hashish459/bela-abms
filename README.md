# Bela — Accounting & Business Management System

An enterprise-grade, functionally-equivalent reimplementation of the authenticated web
application at **https://bela.nepalebilling.com** (Nepal E-Billing — IRD-verified VAT
billing + NFRS reporting).

This is **not** a visual mockup. The goal is a data-relational, secure, testable system
that could become a production replacement for the reference application.

## Repository layout

| Path | Purpose |
|------|---------|
| `Docs/` | Original client brief (`InitialPrompt_clonning.docx`) — do not edit |
| `docs/` | **Living architecture documentation** — read this first every session |
| `app/` | The Next.js application (App Router + Prisma + PostgreSQL) |

## Documentation index (`docs/`)

| File | What it holds |
|------|---------------|
| [`docs/PROGRESS.md`](docs/PROGRESS.md) | **Session log + what's done / what's next.** Start here. |
| [`docs/DISCOVERY-LOG.md`](docs/DISCOVERY-LOG.md) | Raw notes from inspecting the reference app |
| [`docs/INVENTORY.md`](docs/INVENTORY.md) | Complete module / page / action inventory |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | System, frontend, backend, auth, authz architecture |
| [`docs/DATABASE.md`](docs/DATABASE.md) | Entities, relationships, constraints, ER model |
| [`docs/ROUTES.md`](docs/ROUTES.md) | Every implemented route (UI + API) |
| [`docs/WORKFLOWS.md`](docs/WORKFLOWS.md) | Business workflows end-to-end |
| [`docs/ASSUMPTIONS.md`](docs/ASSUMPTIONS.md) | Anything not verified against the reference app |
| [`docs/MASTER-PROMPT.md`](docs/MASTER-PROMPT.md) | Refined enterprise replication prompt |

## Tech stack

- **Framework:** Next.js (App Router, TypeScript)
- **ORM / DB:** Prisma + PostgreSQL
- **Auth:** session-based (httpOnly cookies), server-side permission checks
- **UI:** React + Tailwind CSS
- **Testing:** Vitest (unit/integration) + Playwright (E2E workflows)

## Ground rules (from the client brief)

1. Inspect, don't guess. Document every assumption.
2. No fake data / fake CRUD / fake auth / hard-coded stats.
3. Business calculations are authoritative on the server only.
4. Multi-entity operations run in DB transactions.
5. Never trust IDs, roles, permissions, prices, totals, quantities from the browser.
6. Credentials for the reference app are **never** committed, logged, or hard-coded.
