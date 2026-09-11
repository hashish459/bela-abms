import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { activeFiscalYear } from "@/lib/fiscal-year";
import { MonthlyTaxSummaryView } from "@/components/monthly-tax-summary-view";

export const metadata = { title: "Monthly Tax Summary — Bela ABMS" };

export default async function MonthlyTaxSummaryPage() {
  const s = (await getSession())!;
  if (!can(s.permissions, "reports.tax_reports", "read")) redirect("/dashboard");
  const fy = await activeFiscalYear(s.companyId!);
  return (
    <MonthlyTaxSummaryView
      fyName={fy.name}
      defaultFrom={fy.startDate.toISOString().slice(0, 10)}
      defaultTo={new Date().toISOString().slice(0, 10)}
    />
  );
}
