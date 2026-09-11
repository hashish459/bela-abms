import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { TabNav } from "@/components/tab-nav";

const TABS = [
  { title: "Asset Register", href: "/dashboard/fixed-assets/register", perm: "fixed_assets.asset_register" },
  { title: "Depreciation", href: "/dashboard/fixed-assets/depreciation", perm: "fixed_assets.depreciation" },
];

export default async function FixedAssetsLayout({ children }: LayoutProps<"/">) {
  const s = (await getSession())!;
  const tabs = TABS.filter((t) => can(s.permissions, t.perm, "read")).map(({ title, href }) => ({ title, href }));
  return (
    <div className="space-y-4">
      <TabNav tabs={tabs} />
      {children}
    </div>
  );
}
