import "server-only";
import { db } from "./db";
import { errors } from "./api";

export type Action = "create" | "read" | "update" | "delete";
// key -> set of allowed actions, e.g. { "sales.sales_invoice": ["read","create"] }
export type PermissionSet = Record<string, Action[]>;

export const ADMIN_WILDCARD = "*";

/**
 * Merge RolePermission rows across the user's roles into a flat permission set.
 * ADMIN users get the wildcard and bypass all checks.
 */
export async function getEffectivePermissions(
  roleIds: string[],
  isAdmin: boolean,
): Promise<PermissionSet> {
  if (isAdmin) return { [ADMIN_WILDCARD]: ["create", "read", "update", "delete"] };
  if (roleIds.length === 0) return {};

  const rows = await db.rolePermission.findMany({
    where: { roleId: { in: roleIds } },
    include: { module: { select: { key: true } } },
  });

  const set: PermissionSet = {};
  for (const r of rows) {
    const cur = new Set(set[r.module.key] ?? []);
    if (r.canCreate) cur.add("create");
    if (r.canRead) cur.add("read");
    if (r.canUpdate) cur.add("update");
    if (r.canDelete) cur.add("delete");
    if (cur.size) set[r.module.key] = [...cur];
  }
  return set;
}

export function can(perms: PermissionSet, key: string, action: Action): boolean {
  if (perms[ADMIN_WILDCARD]) return true;
  return (perms[key] ?? []).includes(action);
}

/** Throw 403 unless the permission set allows `action` on `key`. */
export function requirePermission(
  perms: PermissionSet,
  key: string,
  action: Action,
): void {
  if (!can(perms, key, action)) throw errors.forbidden();
}
