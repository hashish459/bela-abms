import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { db } from "@/lib/db";
import { activeFiscalYearId } from "@/lib/fiscal-year";
import { listSalesDocs } from "@/server/sales/service";
import { listContacts } from "@/server/accounts/service";
import { DraftWorkspace } from "../draft-workspace";

export const metadata = { title: "Sales Order — Bela ABMS" };

export default async function SalesOrderPage() {
  const s = (await getSession())!;
  if (!can(s.permissions, "sales.sales_order", "read")) redirect("/dashboard");
  const fyId = await activeFiscalYearId(s.companyId!).catch(() => null);
  const [list, customers, taxRates] = await Promise.all([
    fyId ? listSalesDocs(s.companyId!, fyId, "SALES_ORDER", { page: 1 }) : { rows: [], total: 0, page: 1, pageSize: 15 },
    listContacts(s.companyId!, "CUSTOMER"),
    db.taxRate.findMany({
      where: { companyId: s.companyId!, deletedAt: null, isActive: true },
      select: { id: true, name: true, ratePct: true, isNoTax: true },
      orderBy: { name: "asc" },
    }),
  ]);
  return (
    <DraftWorkspace
      kind="SALES_ORDER"
      title="Sales Order"
      endpoint="/api/sales/orders"
      initial={list}
      customers={customers.map((c) => ({ id: c.id, name: c.name, pan: c.panNumber }))}
      taxRates={taxRates.map((t) => ({ ...t, ratePct: Number(t.ratePct) }))}
      canCreate={can(s.permissions, "sales.sales_order", "create")}
      hasFiscalYear={!!fyId}
    />
  );
}
