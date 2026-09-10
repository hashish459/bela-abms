import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { Construction } from "lucide-react";

/**
 * Catch-all for module routes that are defined in the navigation but not yet
 * implemented. It still enforces the real permission gate so nav visibility and
 * access stay consistent. Each module replaces this with a real page under
 * `dashboard/<module>/…` as it is built (see Docs/PROGRESS.md roadmap).
 */
export default async function ModulePlaceholder({
  params,
}: PageProps<"/dashboard/[...slug]">) {
  const { slug } = await params;
  const route = "/dashboard/" + slug.join("/");
  const session = (await getSession())!;

  const menuItem = await db.menuItem.findFirst({ where: { route } });
  if (!menuItem) notFound();

  if (menuItem.permissionKey && !can(session.permissions, menuItem.permissionKey, "read")) {
    return (
      <div className="rounded-xl border border-border bg-surface p-8 text-center">
        <h1 className="text-lg font-semibold">Access denied</h1>
        <p className="mt-1 text-sm text-muted">
          You do not have permission to view <code>{menuItem.title}</code>.
        </p>
      </div>
    );
  }

  const trail = await breadcrumb(menuItem.id);

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-medium text-muted">{trail.join(" › ")}</p>
        <h1 className="text-xl font-semibold">{menuItem.title}</h1>
      </div>
      <div className="grid place-items-center rounded-xl border border-dashed border-border bg-surface p-12 text-center">
        <Construction size={28} className="text-muted" />
        <p className="mt-3 text-sm font-medium">Module not yet implemented</p>
        <p className="mt-1 max-w-sm text-xs text-muted">
          The route, navigation entry and permission gate for{" "}
          <strong>{menuItem.title}</strong> are wired. The UI, API, schema and
          workflow land in a later module pass.
        </p>
        <code className="mt-3 rounded bg-background px-2 py-1 text-xs ring-1 ring-border">
          {route}
        </code>
      </div>
    </div>
  );
}

async function breadcrumb(id: string): Promise<string[]> {
  const trail: string[] = [];
  let current: string | null = id;
  while (current) {
    const node: { title: string; parentId: string | null } | null =
      await db.menuItem.findUnique({
        where: { id: current },
        select: { title: true, parentId: true },
      });
    if (!node) break;
    trail.unshift(node.title);
    current = node.parentId;
  }
  return trail;
}
