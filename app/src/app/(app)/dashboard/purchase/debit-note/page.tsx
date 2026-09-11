import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { db } from "@/lib/db";
import { activeFiscalYearId } from "@/lib/fiscal-year";
import { listPurchaseDocs } from "@/server/purchase/service";
import { DebitNoteWorkspace } from "./debit-note-workspace";

export const metadata = { title: "Debit Notes — Bela ABMS" };

export default async function DebitNotePage() {
  const s = (await getSession())!;
  if (!can(s.permissions, "purchase.debit_notes", "read")) redirect("/dashboard");
  const fyId = await activeFiscalYearId(s.companyId!).catch(() => null);

  const [list, invoices] = await Promise.all([
    fyId ? listPurchaseDocs(s.companyId!, fyId, "DEBIT_NOTE", { page: 1 }) : { rows: [], total: 0, page: 1, pageSize: 15 },
    db.purchaseDoc.findMany({
      where: { companyId: s.companyId!, type: "INVOICE", status: { in: ["OPEN", "PARTIALLY_PAID", "PAID", "RETURNED"] } },
      orderBy: [{ date: "desc" }],
      take: 100,
      select: {
        id: true, number: true, supplierName: true, grandTotal: true,
        items: {
          orderBy: { order: "asc" },
          select: {
            productId: true, description: true, hsCode: true, qty: true, rate: true,
            discount: true, exciseDuty: true, customDuty: true, taxRateId: true, isNonTaxable: true,
          },
        },
      },
    }),
  ]);

  return (
    <DebitNoteWorkspace
      initial={list}
      invoices={invoices.map((i) => ({
        id: i.id, number: i.number, supplier: i.supplierName ?? "—", grandTotal: i.grandTotal.toFixed(2),
        items: i.items.map((it) => ({
          productId: it.productId ?? "", description: it.description, hsCode: it.hsCode ?? "",
          qty: Number(it.qty), rate: Number(it.rate), discount: Number(it.discount),
          exciseDuty: Number(it.exciseDuty), customDuty: Number(it.customDuty),
          taxRateId: it.taxRateId ?? "", isNonTaxable: it.isNonTaxable,
        })),
      }))}
      canCreate={can(s.permissions, "purchase.debit_notes", "create")}
    />
  );
}
