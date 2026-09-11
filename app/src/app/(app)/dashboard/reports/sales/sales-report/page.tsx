import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { DocReportView } from "@/components/doc-report-view";

export const metadata = { title: "Sales Report — Bela ABMS" };

export default async function SalesReportPage() {
  const s = (await getSession())!;
  if (!can(s.permissions, "reports.sales_reports", "read")) redirect("/dashboard");
  return (
    <DocReportView
      title="Sales Report"
      crumb="Sales"
      apiPath="/api/reports/sales-report?type=INVOICE"
      partyLabel="Customer"
      detailBase="/dashboard/sales/invoice"
    />
  );
}
