import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { PaymentsReportView } from "@/components/payments-report-view";

export const metadata = { title: "Receipt Report — Bela ABMS" };

export default async function ReceiptReportPage() {
  const s = (await getSession())!;
  if (!can(s.permissions, "reports.sales_reports", "read")) redirect("/dashboard");
  return (
    <PaymentsReportView
      title="Receipt Report"
      crumb="Sales"
      apiPath="/api/reports/receipts"
      partyLabel="Customer"
      accountLabel="Received In"
    />
  );
}
