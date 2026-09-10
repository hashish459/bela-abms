import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { activeFiscalYear } from "@/lib/fiscal-year";
import { trialBalance } from "@/server/accounts/gl";
import { TrialBalanceView } from "./trial-balance-view";

export const metadata = { title: "Trial Balance — Bela ABMS" };

export default async function TrialBalancePage() {
  const s = (await getSession())!;
  if (!can(s.permissions, "reports.accounting_reports", "read")) redirect("/dashboard");

  const fy = await activeFiscalYear(s.companyId!);
  const tb = await trialBalance(s.companyId!, fy.id);

  return <TrialBalanceView fyName={fy.name} data={tb} />;
}
