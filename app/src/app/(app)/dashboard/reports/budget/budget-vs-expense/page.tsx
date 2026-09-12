import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { listBudgets } from "@/server/budget/service";
import { BudgetVsExpenseView } from "./budget-vs-expense-view";

export const metadata = { title: "Budget vs Expense Report — Bela ABMS" };

export default async function BudgetVsExpensePage() {
  const s = (await getSession())!;
  if (!can(s.permissions, "reports.budget_reports", "read")) redirect("/dashboard");

  const budgets = await listBudgets(s.companyId!);
  return <BudgetVsExpenseView budgets={budgets.map((b) => ({ id: b.id, name: `${b.name} (${b.fiscalYearName})` }))} />;
}
