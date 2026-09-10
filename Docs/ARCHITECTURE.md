# ARCHITECTURE

> Status: **draft skeleton** — sections marked _TBD_ are completed after discovery.

## 1. System architecture

```
Browser (React / Next.js App Router)
   │  httpOnly session cookie
   ▼
Next.js server (Route Handlers + Server Components + middleware)
   │  Prisma Client
   ▼
PostgreSQL
```

- Single deployable Next.js app. API is `app/api/**` route handlers, grouped by domain.
- All authorization and business calculation happen server-side.
- Middleware guards authenticated route groups and refreshes session.

## 2. Frontend architecture

```
app/
├── (marketing)/          public pages (optional, low priority)
├── (auth)/               login, signup, reset-password
├── (app)/                authenticated shell: layout with header + sidebar
│   ├── dashboard/
│   └── <module>/         one folder per module
├── api/                  route handlers by domain
components/               shared UI (design system)
features/<module>/        module-specific components, hooks, client services
lib/                      db, auth, rbac, audit, api-envelope, validation
server/<module>/          services + repositories (server-only business logic)
```

- **Navigation is data-driven:** sidebar renders from the `menu` table via `/api/menu`,
  filtered by the current user's permissions. No hard-coded menu.
- Forms: React Hook Form + Zod schemas shared between client preview and server validation.

## 3. Backend architecture

- **Layers:** route handler (HTTP + auth gate) → service (business logic, transactions)
  → repository (Prisma queries). Validators (Zod) at the boundary.
- **API response envelope:** `{ ok: true, data }` or `{ ok: false, error: { code, message, details? } }`.
- **Transactions:** any operation touching >1 entity uses `prisma.$transaction`.
- **Audit:** `writeAudit({ userId, action, entity, entityId, meta })` called from services.

## 4. Authentication

- Email + password. Passwords hashed with **argon2id** (or bcrypt cost ≥ 12).
- Session: opaque random token in httpOnly + Secure + SameSite=Lax cookie; server-side
  `session` table with expiry + rotation. Idle + absolute timeout.
- Login rate-limited per IP + per account; generic error messages.
- _Reference auth behavior (redirects, session length): TBD._

## 5. Authorization (RBAC)

```
User ─* UserRole *─ Role ─* RolePermission *─ Permission
Permission.key = "<module>.<action>"   e.g. invoice.create, report.export
Menu.permissionKey ─ gates sidebar visibility AND route access
```

- `requirePermission(key)` helper used in every route handler and server action.
- Navigation visibility and backend checks both derive from the same permission set.
- Never trust role/permission/identity from the client.

## 6. Data model

See [`DATABASE.md`](DATABASE.md).

## 7. Important workflows

See [`WORKFLOWS.md`](WORKFLOWS.md).

## 8. Cross-cutting

| Concern | Approach |
|---------|----------|
| Errors | Central error type → envelope; no stack traces to client; logged with request id |
| Logging | Structured JSON (pino); request id per call |
| Config | `.env` via `@t3-oss/env-nextjs` schema; no prod config in code |
| Migrations | Prisma Migrate; checked into `app/prisma/migrations` |
| Seeding | `app/prisma/seed.ts` — roles, permissions, menu, admin user (no real secrets) |
| Testing | Vitest (services/validation), Playwright (auth, nav, CRUD, billing, authz) |
| Security | See brief §23 — input validation, parameterized queries (Prisma), CSRF token on mutations, IDOR checks in repositories, rate limiting |
