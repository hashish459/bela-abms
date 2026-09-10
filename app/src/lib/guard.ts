import "server-only";
import { requireSession, type SessionUser } from "./auth";
import { requirePermission, type Action } from "./rbac";
import { errors } from "./api";

/**
 * Common gate for company-scoped API routes: authenticated + has `action` on
 * `permKey` + belongs to a company. Returns the session and companyId.
 */
export async function guard(
  permKey: string,
  action: Action,
): Promise<{ session: SessionUser; companyId: string }> {
  const session = await requireSession();
  requirePermission(session.permissions, permKey, action);
  if (!session.companyId) throw errors.badRequest("No active company selected");
  return { session, companyId: session.companyId };
}
