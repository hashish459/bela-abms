import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { DocReportView } from "@/components/doc-report-view";

export const metadata = { title: "Purchase Report — Bela ABMS" };

export default async function PurchaseReportPage() {
  const s = (await getSession())!;
  if (!can(s.permissions, "reports.purchase_reports", "read")) redirect("/dashboard");
  return (
    <DocReportView
      title="Purchase Report"
      crumb="Purchase"
      apiPath="/api/reports/purchase-report?type=INVOICE"
      partyLabel="Supplier"
      detailBase="/dashboard/purchase/purchase-bills"
    />
  );
}
