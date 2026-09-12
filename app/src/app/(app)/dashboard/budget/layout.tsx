import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { TabNav } from "@/components/tab-nav";

const TABS = [
  { title: "Budget Heading", href: "/dashboard/budget/budget-heading", perm: "budget.budget_heading" },
  { title: "Budget", href: "/dashboard/budget/budget", perm: "budget.budget" },
  { title: "Allocation", href: "/dashboard/budget/allocation", perm: "budget.allocation" },
  { title: "Fund", href: "/dashboard/budget/fund", perm: "budget.fund" },
];

export default async function BudgetLayout({ children }: LayoutProps<"/">) {
  const s = (await getSession())!;
  const tabs = TABS.filter((t) => can(s.permissions, t.perm, "read")).map(
    ({ title, href }) => ({ title, href }),
  );
  return (
    <div className="space-y-4">
      <TabNav tabs={tabs} />
      {children}
    </div>
  );
}
