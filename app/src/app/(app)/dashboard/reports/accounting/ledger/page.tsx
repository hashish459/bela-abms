import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { LedgerReportView } from "./ledger-report-view";

export const metadata = { title: "Ledger Report — Bela ABMS" };

export default async function LedgerReportPage() {
  const s = (await getSession())!;
  if (!can(s.permissions, "reports.accounting_reports", "read")) redirect("/dashboard");
  return <LedgerReportView />;
}
