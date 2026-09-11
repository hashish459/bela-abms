import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { activeFiscalYear } from "@/lib/fiscal-year";
import { VatReturnView } from "./vat-return-view";

export const metadata = { title: "VAT Return — Bela ABMS" };

export default async function VatReturnPage() {
  const s = (await getSession())!;
  if (!can(s.permissions, "reports.tax_reports", "read")) redirect("/dashboard");
  const fy = await activeFiscalYear(s.companyId!);
  return (
    <VatReturnView
      fyName={fy.name}
      defaultFrom={fy.startDate.toISOString().slice(0, 10)}
      defaultTo={new Date().toISOString().slice(0, 10)}
    />
  );
}
