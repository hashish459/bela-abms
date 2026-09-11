import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { SalesProfitView } from "@/components/sales-profit-view";

export const metadata = { title: "Sales Profit Report — Bela ABMS" };

export default async function SalesProfitReportPage() {
  const s = (await getSession())!;
  if (!can(s.permissions, "reports.sales_reports", "read")) redirect("/dashboard");
  return <SalesProfitView />;
}
