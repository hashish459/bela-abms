import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { activeFiscalYear } from "@/lib/fiscal-year";
import { BalanceSheetView } from "./balance-sheet-view";

export const metadata = { title: "Balance Sheet — Bela ABMS" };

export default async function BalanceSheetPage() {
  const s = (await getSession())!;
  if (!can(s.permissions, "reports.accounting_reports", "read")) redirect("/dashboard");
  const fy = await activeFiscalYear(s.companyId!);
  return <BalanceSheetView fyName={fy.name} defaultAsOf={new Date().toISOString().slice(0, 10)} />;
}
