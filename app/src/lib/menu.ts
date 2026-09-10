import "server-only";
import { db } from "./db";
import { can, type PermissionSet } from "./rbac";

export type MenuNode = {
  id: string;
  title: string;
  slug: string;
  route: string | null;
  icon: string | null;
  isExternal: boolean;
  children: MenuNode[];
};

/**
 * Build the navigation tree from the MenuItem table, keeping only nodes the user
 * may see: a node is visible if it has no permissionKey, or the user has `read`
 * on that key, or it has at least one visible child.
 */
export async function buildMenu(perms: PermissionSet): Promise<MenuNode[]> {
  const items = await db.menuItem.findMany({
    where: { isActive: true },
    orderBy: [{ order: "asc" }, { title: "asc" }],
  });

  const byParent = new Map<string | null, typeof items>();
  for (const it of items) {
    const k = it.parentId;
    if (!byParent.has(k)) byParent.set(k, []);
    byParent.get(k)!.push(it);
  }

  const build = (parentId: string | null): MenuNode[] => {
    const rows = byParent.get(parentId) ?? [];
    const out: MenuNode[] = [];
    for (const r of rows) {
      const children = build(r.id);
      const isGroup = (byParent.get(r.id)?.length ?? 0) > 0;

      if (isGroup) {
        // A group is shown only when it has at least one visible child, or the
        // group node itself carries a permission the user holds.
        const selfVisible = r.permissionKey
          ? can(perms, r.permissionKey, "read")
          : false;
        if (children.length === 0 && !selfVisible) continue;
      } else {
        // A leaf is shown when it has no permission requirement, or the user
        // has read on it.
        if (r.permissionKey && !can(perms, r.permissionKey, "read")) continue;
      }

      out.push({
        id: r.id,
        title: r.title,
        slug: r.slug,
        route: r.route,
        icon: r.icon,
        isExternal: r.isExternal,
        children,
      });
    }
    return out;
  };

  return build(null);
}
