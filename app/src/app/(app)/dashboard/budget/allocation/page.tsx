import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { getBudgetAllocations, listBudgets } from "@/server/budget/service";
import { AllocationManager } from "./allocation-manager";

export const metadata = { title: "Allocation — Bela ABMS" };

export default async function AllocationPage({
  searchParams,
}: {
  searchParams: Promise<{ budgetId?: string }>;
}) {
  const s = (await getSession())!;
  if (!can(s.permissions, "budget.allocation", "read")) redirect("/dashboard");

  const { budgetId } = await searchParams;
  const budgets = await listBudgets(s.companyId!);
  const data = budgetId ? await getBudgetAllocations(s.companyId!, budgetId).catch(() => null) : null;

  return (
    <AllocationManager
      budgets={budgets.map((b) => ({ id: b.id, name: `${b.name} (${b.fiscalYearName})` }))}
      selectedBudgetId={budgetId ?? ""}
      data={data}
      canUpdate={can(s.permissions, "budget.allocation", "update")}
    />
  );
}
