import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { TabNav } from "@/components/tab-nav";

const TABS = [
  { title: "System Info", href: "/dashboard/system/info", perm: "system.system_info" },
  { title: "Database Console", href: "/dashboard/system/query", perm: "system.database_console" },
];

export default async function SystemLayout({ children }: LayoutProps<"/">) {
  const s = (await getSession())!;
  const tabs = TABS.filter((t) => can(s.permissions, t.perm, "read")).map(({ title, href }) => ({ title, href }));
  return (
    <div className="space-y-4">
      <TabNav tabs={tabs} />
      {children}
    </div>
  );
}
