import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { PaymentsReportView } from "@/components/payments-report-view";

export const metadata = { title: "Payment Report — Bela ABMS" };

export default async function PaymentReportPage() {
  const s = (await getSession())!;
  if (!can(s.permissions, "reports.purchase_reports", "read")) redirect("/dashboard");
  return (
    <PaymentsReportView
      title="Payment Report"
      crumb="Purchase"
      apiPath="/api/reports/payments"
      partyLabel="Supplier"
      accountLabel="Paid From"
    />
  );
}
