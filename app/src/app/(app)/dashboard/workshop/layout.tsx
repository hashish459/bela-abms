import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { TabNav } from "@/components/tab-nav";

const TABS = [
  { title: "Job Card", href: "/dashboard/workshop/job-card", perm: "workshop.job_card" },
  { title: "Technician", href: "/dashboard/workshop/technician", perm: "workshop.technician" },
];

export default async function WorkshopLayout({ children }: LayoutProps<"/">) {
  const s = (await getSession())!;
  const tabs = TABS.filter((t) => can(s.permissions, t.perm, "read")).map(({ title, href }) => ({ title, href }));
  return (
    <div className="space-y-4">
      <TabNav tabs={tabs} />
      {children}
    </div>
  );
}
