import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { db } from "@/lib/db";
import { activeFiscalYearId } from "@/lib/fiscal-year";
import { listSalesDocs } from "@/server/sales/service";
import { CreditNoteWorkspace } from "./credit-note-workspace";

export const metadata = { title: "Credit Note — Bela ABMS" };

export default async function CreditNotePage() {
  const s = (await getSession())!;
  if (!can(s.permissions, "sales.credit_note", "read")) redirect("/dashboard");
  const fyId = await activeFiscalYearId(s.companyId!).catch(() => null);

  const [list, invoices] = await Promise.all([
    fyId ? listSalesDocs(s.companyId!, fyId, "CREDIT_NOTE", { page: 1 }) : { rows: [], total: 0, page: 1, pageSize: 15 },
    db.salesDoc.findMany({
      where: {
        companyId: s.companyId!, type: "INVOICE",
        status: { in: ["OPEN", "PARTIALLY_PAID", "PAID", "RETURNED"] },
      },
      orderBy: [{ date: "desc" }],
      take: 100,
      select: {
        id: true, number: true, customerName: true, grandTotal: true,
        items: {
          orderBy: { order: "asc" },
          select: {
            productId: true, description: true, hsCode: true, qty: true, rate: true,
            discount: true, taxRateId: true, isNonTaxable: true,
          },
        },
      },
    }),
  ]);

  return (
    <CreditNoteWorkspace
      initial={list}
      invoices={invoices.map((i) => ({
        id: i.id,
        number: i.number,
        customer: i.customerName ?? "—",
        grandTotal: i.grandTotal.toFixed(2),
        items: i.items.map((it) => ({
          productId: it.productId ?? "",
          description: it.description,
          hsCode: it.hsCode ?? "",
          qty: Number(it.qty),
          rate: Number(it.rate),
          discount: Number(it.discount),
          taxRateId: it.taxRateId ?? "",
          isNonTaxable: it.isNonTaxable,
        })),
      }))}
      canCreate={can(s.permissions, "sales.credit_note", "create")}
    />
  );
}
