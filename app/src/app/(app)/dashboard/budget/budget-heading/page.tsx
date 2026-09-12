import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { listGroups } from "@/server/accounts/service";
import { listBudgetHeadings } from "@/server/budget/service";
import { BudgetHeadingManager } from "./budget-heading-manager";

export const metadata = { title: "Budget Heading — Bela ABMS" };

export default async function BudgetHeadingPage() {
  const s = (await getSession())!;
  if (!can(s.permissions, "budget.budget_heading", "read")) redirect("/dashboard");

  const [headings, groups] = await Promise.all([
    listBudgetHeadings(s.companyId!),
    listGroups(s.companyId!),
  ]);

  return (
    <BudgetHeadingManager
      initial={headings}
      groups={groups.map((g) => ({ id: g.id, label: `${g.name} (${g.code})` }))}
      canCreate={can(s.permissions, "budget.budget_heading", "create")}
      canUpdate={can(s.permissions, "budget.budget_heading", "update")}
      canDelete={can(s.permissions, "budget.budget_heading", "delete")}
    />
  );
}
