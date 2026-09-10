import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { ADMIN_WILDCARD } from "@/lib/rbac";

export const metadata = { title: "Dashboard — Bela ABMS" };

export default async function DashboardPage() {
  const session = (await getSession())!;

  const groups = await db.permissionModule.findMany({
    orderBy: { order: "asc" },
    select: { key: true, label: true, groupKey: true, groupName: true },
  });

  const allowed = new Set(
    session.permissions[ADMIN_WILDCARD]
      ? groups.map((g) => g.key)
      : Object.keys(session.permissions),
  );

  const byGroup = new Map<string, { name: string; mods: string[] }>();
  for (const g of groups) {
    if (!allowed.has(g.key)) continue;
    if (!byGroup.has(g.groupKey))
      byGroup.set(g.groupKey, { name: g.groupName, mods: [] });
    byGroup.get(g.groupKey)!.mods.push(g.label);
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium text-muted">Dashboard</p>
        <h1 className="text-xl font-semibold">
          Welcome back, {session.firstName}
        </h1>
      </div>

      <div className="rounded-xl border border-border bg-surface p-4 text-sm">
        <p className="text-muted">
          Foundation is live: authentication, role-based access control, and
          data-driven navigation. Business metrics (sales, purchases, cash flow,
          outstanding) activate as each transaction module is implemented — no
          placeholder figures are shown.
        </p>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-muted">
          Modules you can access ({byGroup.size} groups)
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[...byGroup.entries()].map(([key, g]) => (
            <div
              key={key}
              className="rounded-xl border border-border bg-surface p-4"
            >
              <p className="text-sm font-semibold">{g.name}</p>
              <p className="mt-1 text-xs text-muted">
                {g.mods.slice(0, 6).join(" · ")}
                {g.mods.length > 6 ? ` +${g.mods.length - 6}` : ""}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
