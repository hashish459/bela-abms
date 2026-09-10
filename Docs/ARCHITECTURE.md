# ARCHITECTURE

## 0. Reference application (observed — what we are replicating)

| Layer | Reference (`bela.nepalebilling.com`) | Our clone (`app/`) |
|-------|--------------------------------------|--------------------|
| Frontend | Next.js **Pages Router** SPA | Next.js 16 **App Router** (RSC) |
| Backend | **Django REST Framework** at `bela.api.nepalebilling.com` (+ shared `api.nepalebilling.com`). 76 models; families `/invoices/` (trade docs), `/slips/` (vouchers), `/ledgers/` (3-level COA) | Next.js route handlers (`app/api/**`), layered service/repository; one `postVoucher()` GL writer |
| DB | PostgreSQL, **schema-per-tenant** (django-tenants); companies nestable (`parent_company`) | PostgreSQL + Prisma, **single schema, `companyId` column** scoping (A5) |
| Auth | **JWT** (SimpleJWT) — `access_token`/`refresh_token` cookies, JS-readable | JWT in **httpOnly** cookies, rotating refresh, server-side session load |
| RBAC | Django groups + model perms (301 perms / 76 models); groups Admin/Cashier/Retailer/Storekeeper; UI matrix maps to nav modules | `Role` + `RolePermission` CRUD matrix over `PermissionModule` (nav-grouped) |
| Accounting | Real double-entry GL; reports read the ledger, not documents | same — `Voucher`/`VoucherLine`, `postVoucher()` invariant ΣDr=ΣCr |
| i18n | Nepali fiscal year (BS) in UI, **AD dates in API**, Nepali months, `Rs.` (NPR) | same; BS⇆AD date layer (`nepali-date-converter`), store AD, display BS |
| Compliance | IRD: PAN, CBMS username/password, "Sync With IRD", gap-free sequential invoice numbers | model the fields + a stubbed CBMS integration seam (A16); enforce numbering (A15) |
| Styling | Tailwind, accent `#00A8E8`, DM Sans, bg `#F0F0F0` | identical tokens in `globals.css` |

## 1. System

```
Browser (React / App Router)
   │  httpOnly JWT cookies (abms_access 15m, abms_refresh 7d rotating)
   ▼
Next.js server  ── src/proxy.ts (edge guard for /dashboard/*)
   ├─ Server Components: getSession() → user + company + permissions
   ├─ Route handlers (app/api/**): requireSession + requirePermission
   ▼
Prisma ▶ PostgreSQL (bela_abms)
```

## 2. Frontend

```
app/
  (auth)/login              login page + client LoginForm (Suspense-wrapped)
  (app)/layout.tsx          getSession→redirect, buildMenu, renders <AppShell>
  (app)/dashboard/          dashboard + [...slug] catch-all stub
  api/auth/{login,logout,refresh,me}/route.ts
  api/menu/route.ts
components/app-shell.tsx    sidebar (data-driven, recursive NavItem) + header + user menu
lib/                        env, db, api(envelope+HttpError+handler), jwt, password,
                            cookies, session(issue/rotate), auth(getSession/requireSession),
                            rbac(getEffectivePermissions/can/requirePermission), menu(buildMenu),
                            audit(writeAudit/clientIp)
prisma/schema.prisma        platform models
prisma/seed.ts              permission catalogue + menu tree + demo company/users
```

- **Navigation is data-driven:** `MenuItem` table → `buildMenu(permissions)` filters nodes
  (leaf hidden without `read` on its `permissionKey`; group hidden when no visible child) →
  `/api/menu` and the server layout both use it. No hard-coded menu.
- Forms (later): React Hook Form + Zod schema shared client preview / server validation.

## 3. Backend

- **Layers:** route handler (HTTP + `requireSession` + `requirePermission`) → service
  (business logic, `prisma.$transaction`) → repository (Prisma queries). Zod at the edge.
- **Envelope:** `lib/api.ts` `ok()` / `fail()` / `handler()` wrapper turns `HttpError` &
  `ZodError` into clean responses; unexpected errors log server-side, return generic 500.
- **Audit:** `writeAudit()` from services for LOGIN/LOGOUT/CREATE/UPDATE/DELETE/APPROVE/…
- **Transactions:** any multi-entity operation (invoice = header + items + stock move +
  ledger + audit) in one `$transaction`.

## 4. Authentication (implemented)

- Email + password; bcrypt cost 12 (`lib/password.ts`).
- `POST /api/auth/login` → `issueSession()` signs access (`jose`, HS256, 15m) + refresh
  (7d, random `jti`), stores sha256(refresh) in `RefreshToken`, sets httpOnly+SameSite=Lax
  cookies. `lastLoginAt` updated, `AuditLog` LOGIN, `LoginAttempt` recorded.
- Throttle: ≥8 failed attempts / 15 min per email ⇒ 429.
- `POST /api/auth/refresh`: verifies + looks up token, **revokes old**, issues new pair
  (rotating). Reuse/revoked ⇒ cookies cleared.
- `src/proxy.ts` verifies access JWT for `/dashboard/*`; redirects to `/login?next=`.
- Production: set `COOKIE_SECURE=true`, strong `JWT_*_SECRET`.

## 5. Authorization (implemented)

```
User ─UserRole─ Role ─RolePermission─ PermissionModule      (key = "<group>.<module>")
                                       actions: create | read | update | delete
User.userType == "ADMIN"  ⇒  wildcard (all actions on all modules)
```

- `getEffectivePermissions(roleIds, isAdmin)` merges RolePermission rows → `PermissionSet`
  (`{ "sales.sales_invoice": ["read","create"] }`).
- `can(perms, key, action)` / `requirePermission(perms, key, action)` (throws 403).
- Same `PermissionSet` drives **both** nav visibility and API authorization.
- Roles are per-company; a user's roles are filtered to the active company in `getSession`.

## 6–8. Data model / workflows / cross-cutting
See [`DATABASE.md`](DATABASE.md), [`WORKFLOWS.md`](WORKFLOWS.md).
Config `.env` (see `.env.example`) · logging via `console` now, `pino` wired later ·
migrations `prisma migrate` · tests Vitest + Playwright (Phase 5+).

## Implementation status
✅ Foundation (auth, RBAC, data-driven nav, app shell, error envelope, audit, seed).
⬜ Everything domain: Settings UI, Accounts, Inventory, Sales, Purchase, Vouchers, Reports,
CRM, Budget, Token, Documents, Store Builder — see `PROGRESS.md` roadmap.
