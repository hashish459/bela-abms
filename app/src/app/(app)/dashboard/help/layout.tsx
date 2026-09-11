import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { TabNav } from "@/components/tab-nav";

const TABS = [
  { title: "Getting Started", href: "/dashboard/help/getting-started" },
  { title: "Accounts & GL", href: "/dashboard/help/accounts-gl" },
  { title: "Sales", href: "/dashboard/help/sales" },
  { title: "Purchase", href: "/dashboard/help/purchase" },
  { title: "Inventory", href: "/dashboard/help/inventory" },
  { title: "Reports", href: "/dashboard/help/reports" },
  { title: "Roles & Permissions", href: "/dashboard/help/roles-permissions" },
];

export default async function HelpLayout({ children }: LayoutProps<"/">) {
  const s = (await getSession())!;
  const visible = can(s.permissions, "help.user_manuals", "read") ? TABS : [];
  return (
    <div className="space-y-4">
      <TabNav tabs={visible} />
      {children}
    </div>
  );
}
