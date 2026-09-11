import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { DocReportView } from "@/components/doc-report-view";

export const metadata = { title: "Sales Return Report — Bela ABMS" };

export default async function SalesReturnReportPage() {
  const s = (await getSession())!;
  if (!can(s.permissions, "reports.sales_reports", "read")) redirect("/dashboard");
  return (
    <DocReportView
      title="Sales Return Report"
      crumb="Sales"
      apiPath="/api/reports/sales-report?type=CREDIT_NOTE"
      partyLabel="Customer"
    />
  );
}
