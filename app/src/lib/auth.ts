import "server-only";
import { cookies } from "next/headers";
import { db } from "./db";
import { ACCESS_COOKIE } from "./cookies";
import { verifyAccessToken } from "./jwt";
import { errors } from "./api";
import { getEffectivePermissions, type PermissionSet } from "./rbac";

export type SessionUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  userType: string;
  isAdmin: boolean;
  companyId: string | null;
  roleNames: string[];
  permissions: PermissionSet;
};

/** Returns the current user or null. Never throws. */
export async function getSession(): Promise<SessionUser | null> {
  const token = (await cookies()).get(ACCESS_COOKIE)?.value;
  if (!token) return null;

  let claims;
  try {
    claims = await verifyAccessToken(token);
  } catch {
    return null;
  }

  const user = await db.user.findFirst({
    where: { id: claims.sub, deletedAt: null, status: "ACTIVE" },
    include: {
      roleLinks: { include: { role: true } },
      companyLinks: true,
    },
  });
  if (!user) return null;

  const companyId =
    claims.companyId ??
    user.companyLinks.find((l) => l.isDefault)?.companyId ??
    user.companyLinks[0]?.companyId ??
    null;

  const isAdmin = user.userType === "ADMIN";
  const roleIds = user.roleLinks
    .filter((l) => (companyId ? l.role.companyId === companyId : true))
    .map((l) => l.roleId);

  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    userType: user.userType,
    isAdmin,
    companyId,
    roleNames: user.roleLinks.map((l) => l.role.name),
    permissions: await getEffectivePermissions(roleIds, isAdmin),
  };
}

/** Returns the current user or throws 401. Use in API route handlers. */
export async function requireSession(): Promise<SessionUser> {
  const s = await getSession();
  if (!s) throw errors.unauthorized();
  return s;
}
