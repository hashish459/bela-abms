import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { listBudgetFunds } from "@/server/budget/service";
import { FundManager } from "./fund-manager";

export const metadata = { title: "Fund — Bela ABMS" };

export default async function FundPage() {
  const s = (await getSession())!;
  if (!can(s.permissions, "budget.fund", "read")) redirect("/dashboard");

  const funds = await listBudgetFunds(s.companyId!);
  return (
    <FundManager
      initial={funds.map((f) => ({ id: f.id, name: f.name, isActive: f.isActive }))}
      canCreate={can(s.permissions, "budget.fund", "create")}
      canUpdate={can(s.permissions, "budget.fund", "update")}
      canDelete={can(s.permissions, "budget.fund", "delete")}
    />
  );
}
