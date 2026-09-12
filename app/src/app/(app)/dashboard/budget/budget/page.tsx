import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { listFiscalYears } from "@/server/settings/service";
import { listBudgetFunds, listBudgets } from "@/server/budget/service";
import { BudgetManager } from "./budget-manager";

export const metadata = { title: "Budget — Bela ABMS" };

export default async function BudgetPage() {
  const s = (await getSession())!;
  if (!can(s.permissions, "budget.budget", "read")) redirect("/dashboard");

  const [budgets, fiscalYears, funds] = await Promise.all([
    listBudgets(s.companyId!),
    listFiscalYears(s.companyId!),
    listBudgetFunds(s.companyId!),
  ]);

  return (
    <BudgetManager
      initial={budgets}
      fiscalYears={fiscalYears.map((fy) => ({ id: fy.id, name: fy.name }))}
      funds={funds.filter((f) => f.isActive).map((f) => ({ id: f.id, name: f.name }))}
      canCreate={can(s.permissions, "budget.budget", "create")}
      canUpdate={can(s.permissions, "budget.budget", "update")}
      canDelete={can(s.permissions, "budget.budget", "delete")}
      canAllocate={can(s.permissions, "budget.allocation", "read")}
    />
  );
}
