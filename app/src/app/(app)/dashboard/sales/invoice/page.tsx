import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { db } from "@/lib/db";
import { activeFiscalYearId } from "@/lib/fiscal-year";
import { listSalesDocs } from "@/server/sales/service";
import { listContacts } from "@/server/accounts/service";
import { InvoiceWorkspace } from "./invoice-workspace";

export const metadata = { title: "Sales Invoice — Bela ABMS" };

export default async function InvoicePage() {
  const s = (await getSession())!;
  if (!can(s.permissions, "sales.sales_invoice", "read")) redirect("/dashboard");

  const fyId = await activeFiscalYearId(s.companyId!).catch(() => null);
  const [list, customers, taxRates, cashBank] = await Promise.all([
    fyId
      ? listSalesDocs(s.companyId!, fyId, "INVOICE", { page: 1 })
      : { rows: [], total: 0, page: 1, pageSize: 15 },
    listContacts(s.companyId!, "CUSTOMER"),
    db.taxRate.findMany({
      where: { companyId: s.companyId!, deletedAt: null, isActive: true },
      select: { id: true, name: true, ratePct: true, isNoTax: true },
      orderBy: { name: "asc" },
    }),
    db.ledger.findMany({
      where: {
        companyId: s.companyId!,
        deletedAt: null,
        isActive: true,
        accountGroup: { accountHead: { code: "CCE" } },
      },
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <InvoiceWorkspace
      initial={list}
      customers={customers.map((c) => ({ id: c.id, name: c.name, pan: c.panNumber }))}
      taxRates={taxRates.map((t) => ({ ...t, ratePct: Number(t.ratePct) }))}
      cashBank={cashBank}
      canCreate={can(s.permissions, "sales.sales_invoice", "create")}
      hasFiscalYear={!!fyId}
    />
  );
}
