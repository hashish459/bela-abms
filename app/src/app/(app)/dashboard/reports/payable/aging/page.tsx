import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { AgingView } from "@/components/aging-view";

export const metadata = { title: "Payable Aging — Bela ABMS" };

export default async function PayableAgingPage() {
  const s = (await getSession())!;
  if (!can(s.permissions, "reports.payable_reports", "read")) redirect("/dashboard");
  return (
    <AgingView
      title="Payable Aging"
      crumb="Payable"
      apiPath="/api/reports/aging/payable"
      partyLabel="Supplier"
    />
  );
}
