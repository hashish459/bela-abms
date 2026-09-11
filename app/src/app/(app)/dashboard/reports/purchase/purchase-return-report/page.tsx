import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { DocReportView } from "@/components/doc-report-view";

export const metadata = { title: "Purchase Return Report — Bela ABMS" };

export default async function PurchaseReturnReportPage() {
  const s = (await getSession())!;
  if (!can(s.permissions, "reports.purchase_reports", "read")) redirect("/dashboard");
  return (
    <DocReportView
      title="Purchase Return Report"
      crumb="Purchase"
      apiPath="/api/reports/purchase-report?type=DEBIT_NOTE"
      partyLabel="Supplier"
    />
  );
}
