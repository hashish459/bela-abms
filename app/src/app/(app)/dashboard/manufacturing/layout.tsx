import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { TabNav } from "@/components/tab-nav";

const TABS = [
  { title: "Bill of Materials", href: "/dashboard/manufacturing/bom", perm: "manufacturing.bill_of_materials" },
  { title: "Production Order", href: "/dashboard/manufacturing/production-order", perm: "manufacturing.production_order" },
];

export default async function ManufacturingLayout({ children }: LayoutProps<"/">) {
  const s = (await getSession())!;
  const tabs = TABS.filter((t) => can(s.permissions, t.perm, "read")).map(({ title, href }) => ({ title, href }));
  return (
    <div className="space-y-4">
      <TabNav tabs={tabs} />
      {children}
    </div>
  );
}
