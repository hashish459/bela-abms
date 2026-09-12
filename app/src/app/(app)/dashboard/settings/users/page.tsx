import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { getPermissionModules, listBranches, listRoles, listUsers } from "@/server/settings/service";
import { UsersPermissionsManager } from "./users-permissions-manager";

export const metadata = { title: "User & Permissions — Bela ABMS" };

export default async function UsersPage() {
  const s = (await getSession())!;
  if (!can(s.permissions, "settings.users", "read")) redirect("/dashboard");

  const canSeeRoles = can(s.permissions, "settings.roles_and_permissions", "read");
  const [users, roles, groups, branches] = await Promise.all([
    listUsers(s.companyId!),
    canSeeRoles ? listRoles(s.companyId!) : Promise.resolve([]),
    canSeeRoles ? getPermissionModules() : Promise.resolve([]),
    listBranches(s.companyId!),
  ]);

  return (
    <UsersPermissionsManager
      currentUserId={s.id}
      users={users}
      roles={roles}
      groups={groups}
      branches={branches.map((b) => ({ id: b.id, name: b.name, address: b.address }))}
      perms={{
        usersCreate: can(s.permissions, "settings.users", "create"),
        usersUpdate: can(s.permissions, "settings.users", "update"),
        rolesRead: canSeeRoles,
        rolesCreate: can(s.permissions, "settings.roles_and_permissions", "create"),
        rolesUpdate: can(s.permissions, "settings.roles_and_permissions", "update"),
        rolesDelete: can(s.permissions, "settings.roles_and_permissions", "delete"),
        branchesCreate: can(s.permissions, "settings.users", "create"),
        branchesDelete: can(s.permissions, "settings.users", "delete"),
      }}
    />
  );
}
