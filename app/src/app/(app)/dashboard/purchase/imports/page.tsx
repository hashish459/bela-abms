import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { db } from "@/lib/db";
import { activeFiscalYearId } from "@/lib/fiscal-year";
import { listImportShipments } from "@/server/import-shipment/service";
import { listContacts } from "@/server/accounts/service";
import { ImportsWorkspace } from "./imports-workspace";

export const metadata = { title: "Imports — Bela ABMS" };

export default async function ImportsPage() {
  const s = (await getSession())!;
  if (!can(s.permissions, "purchase.imports", "read")) redirect("/dashboard");
  const fyId = await activeFiscalYearId(s.companyId!).catch(() => null);

  const [list, suppliers, recentInvoices] = await Promise.all([
    listImportShipments(s.companyId!, fyId, { page: 1 }),
    listContacts(s.companyId!, "SUPPLIER"),
    db.purchaseDoc.findMany({
      where: { companyId: s.companyId!, type: "INVOICE" },
      orderBy: { date: "desc" },
      take: 30,
      select: { id: true, number: true, supplierName: true },
    }),
  ]);

  return (
    <ImportsWorkspace
      initial={list}
      suppliers={suppliers.map((c) => ({ id: c.id, name: c.name }))}
      recentInvoices={recentInvoices.map((i) => ({ id: i.id, label: `${i.number} — ${i.supplierName ?? "—"}` }))}
      canCreate={can(s.permissions, "purchase.imports", "create")}
    />
  );
}
