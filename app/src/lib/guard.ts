import "server-only";
import { cookies, headers } from "next/headers";
import { requireSession, type SessionUser } from "./auth";
import { requirePermission, type Action } from "./rbac";
import { errors } from "./api";
import { CSRF_COOKIE } from "./cookies";

export const CSRF_HEADER = "x-csrf-token";

/**
 * Double-submit CSRF check: the token was set as a readable (non-httpOnly)
 * cookie at login (src/lib/session.ts issueSession), and the client echoes
 * it back as a header (src/components/ui.tsx `api()`). A cross-site
 * attacker can make the browser SEND the cookie automatically, but cannot
 * READ it to also set the matching header — so the two only match for
 * same-origin requests. Only enforced for mutating actions; a `read` can't
 * change state, so it isn't a CSRF target.
 */
async function assertCsrf() {
  const [jar, hdrs] = await Promise.all([cookies(), headers()]);
  const cookieToken = jar.get(CSRF_COOKIE)?.value;
  const headerToken = hdrs.get(CSRF_HEADER);
  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    throw errors.forbidden("Invalid or missing CSRF token");
  }
}

/**
 * Common gate for company-scoped API routes: authenticated + has `action` on
 * `permKey` + belongs to a company + (for mutations) a valid CSRF token.
 * Returns the session and companyId.
 */
export async function guard(
  permKey: string,
  action: Action,
): Promise<{ session: SessionUser; companyId: string }> {
  const session = await requireSession();
  requirePermission(session.permissions, permKey, action);
  if (action !== "read") await assertCsrf();
  if (!session.companyId) throw errors.badRequest("No active company selected");
  return { session, companyId: session.companyId };
}
