import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { VoucherReportView } from "@/components/voucher-report-view";

export const metadata = { title: "Journal Report — Bela ABMS" };

export default async function JournalReportPage() {
  const s = (await getSession())!;
  if (!can(s.permissions, "reports.accounting_reports", "read")) redirect("/dashboard");
  return <VoucherReportView title="Journal Report" crumb="Accounting" apiPath="/api/reports/voucher-report?type=JOURNAL" />;
}
