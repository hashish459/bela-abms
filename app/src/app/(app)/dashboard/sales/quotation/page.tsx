import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { db } from "@/lib/db";
import { activeFiscalYearId } from "@/lib/fiscal-year";
import { listSalesDocs } from "@/server/sales/service";
import { listContacts } from "@/server/accounts/service";
import { DraftWorkspace } from "../draft-workspace";

export const metadata = { title: "Quotation — Bela ABMS" };

export default async function QuotationPage() {
  const s = (await getSession())!;
  if (!can(s.permissions, "sales.quotation", "read")) redirect("/dashboard");
  const fyId = await activeFiscalYearId(s.companyId!).catch(() => null);
  const [list, customers, taxRates] = await Promise.all([
    fyId ? listSalesDocs(s.companyId!, fyId, "QUOTATION", { page: 1 }) : { rows: [], total: 0, page: 1, pageSize: 15 },
    listContacts(s.companyId!, "CUSTOMER"),
    db.taxRate.findMany({
      where: { companyId: s.companyId!, deletedAt: null, isActive: true },
      select: { id: true, name: true, ratePct: true, isNoTax: true },
      orderBy: { name: "asc" },
    }),
  ]);
  return (
    <DraftWorkspace
      kind="QUOTATION"
      title="Quotation"
      endpoint="/api/sales/quotations"
      initial={list}
      customers={customers.map((c) => ({ id: c.id, name: c.name, pan: c.panNumber }))}
      taxRates={taxRates.map((t) => ({ ...t, ratePct: Number(t.ratePct) }))}
      canCreate={can(s.permissions, "sales.quotation", "create")}
      hasFiscalYear={!!fyId}
    />
  );
}
