import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { db } from "@/lib/db";
import { activeFiscalYearId } from "@/lib/fiscal-year";
import { listPurchaseDocs } from "@/server/purchase/service";
import { listContacts } from "@/server/accounts/service";
import { PurchaseInvoiceWorkspace } from "./purchase-invoice-workspace";

export const metadata = { title: "Purchase Invoice — Bela ABMS" };

export default async function PurchaseBillsPage() {
  const s = (await getSession())!;
  if (!can(s.permissions, "purchase.purchase_invoice", "read")) redirect("/dashboard");

  const fyId = await activeFiscalYearId(s.companyId!).catch(() => null);
  const [list, suppliers, taxRates, cashBank] = await Promise.all([
    fyId
      ? listPurchaseDocs(s.companyId!, fyId, "INVOICE", { page: 1 })
      : { rows: [], total: 0, page: 1, pageSize: 15 },
    listContacts(s.companyId!, "SUPPLIER"),
    db.taxRate.findMany({
      where: { companyId: s.companyId!, deletedAt: null, isActive: true },
      select: { id: true, name: true, ratePct: true, isNoTax: true },
      orderBy: { name: "asc" },
    }),
    db.ledger.findMany({
      where: {
        companyId: s.companyId!, deletedAt: null, isActive: true,
        accountGroup: { accountHead: { code: "CCE" } },
      },
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <PurchaseInvoiceWorkspace
      initial={list}
      suppliers={suppliers.map((c) => ({ id: c.id, name: c.name, pan: c.panNumber }))}
      taxRates={taxRates.map((t) => ({ ...t, ratePct: Number(t.ratePct) }))}
      cashBank={cashBank}
      canCreate={can(s.permissions, "purchase.purchase_invoice", "create")}
      hasFiscalYear={!!fyId}
    />
  );
}
