import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { GeneralLedgerSummaryView } from "@/components/general-ledger-summary-view";

export const metadata = { title: "General Ledger Summary — Bela ABMS" };

export default async function GeneralLedgerSummaryPage() {
  const s = (await getSession())!;
  if (!can(s.permissions, "reports.accounting_reports", "read")) redirect("/dashboard");
  return <GeneralLedgerSummaryView />;
}
