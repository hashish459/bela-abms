import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { AgingView } from "@/components/aging-view";

export const metadata = { title: "Receivable Aging — Bela ABMS" };

export default async function ReceivableAgingPage() {
  const s = (await getSession())!;
  if (!can(s.permissions, "reports.receivable_reports", "read")) redirect("/dashboard");
  return (
    <AgingView
      title="Receivable Aging"
      crumb="Receivable"
      apiPath="/api/reports/aging/receivable"
      partyLabel="Customer"
    />
  );
}
