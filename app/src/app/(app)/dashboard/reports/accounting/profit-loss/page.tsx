import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { activeFiscalYear } from "@/lib/fiscal-year";
import { ProfitLossView } from "./profit-loss-view";

export const metadata = { title: "Profit & Loss — Bela ABMS" };

export default async function ProfitLossPage() {
  const s = (await getSession())!;
  if (!can(s.permissions, "reports.accounting_reports", "read")) redirect("/dashboard");
  const fy = await activeFiscalYear(s.companyId!);
  return (
    <ProfitLossView
      fyName={fy.name}
      defaultFrom={fy.startDate.toISOString().slice(0, 10)}
      defaultTo={new Date().toISOString().slice(0, 10)}
    />
  );
}
