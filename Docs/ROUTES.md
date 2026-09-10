# ROUTES

Every implemented route. Keep in sync with the app. `A` = requires auth, `P:<key>` = permission.

## UI routes

| Route | Auth | Permission | Page | Notes |
|-------|------|------------|------|-------|
| `/login` | – | – | Login | |
| `/logout` | A | – | (action) | |
| `/reset-password` | – | – | Request reset | |
| `/dashboard` | A | `dashboard.view` | Dashboard | _TBD widgets_ |
| _module routes_ | | | | _added per module_ |

## API routes

Envelope: `{ ok, data }` / `{ ok:false, error:{ code, message, details? } }`.

| Method | Path | Auth | Permission | Purpose |
|--------|------|------|------------|---------|
| POST | `/api/auth/login` | – | – | Create session |
| POST | `/api/auth/logout` | A | – | Revoke session |
| GET | `/api/auth/me` | A | – | Current user + permissions |
| POST | `/api/auth/reset-password` | – | – | Start reset flow |
| GET | `/api/menu` | A | – | Permission-filtered navigation tree |
| _domain endpoints_ | | | | _added per module, grouped by domain_ |

## Route groups (Next.js)

- `app/(auth)/*` — unauthenticated
- `app/(app)/*` — wrapped by authenticated layout; `middleware.ts` redirects to `/login`
- `app/api/*` — route handlers; each calls `requireSession()` / `requirePermission()`
