import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { db } from "@/lib/db";
import { activeFiscalYearId } from "@/lib/fiscal-year";
import { listContacts } from "@/server/accounts/service";
import { ReceiptWorkspace } from "./receipt-workspace";

export const metadata = { title: "Receipts — Bela ABMS" };

export default async function ReceiptPage() {
  const s = (await getSession())!;
  if (!can(s.permissions, "sales.receipt", "read")) redirect("/dashboard");
  const fyId = await activeFiscalYearId(s.companyId!).catch(() => null);

  const [receipts, customers, cashBank, openInvoices] = await Promise.all([
    fyId
      ? db.receipt.findMany({
          where: { companyId: s.companyId!, fiscalYearId: fyId },
          orderBy: [{ date: "desc" }, { number: "desc" }],
          take: 15,
          select: {
            id: true, number: true, date: true, amount: true, paymentMode: true, reference: true,
            againstDoc: { select: { number: true } },
            customerLedgerId: true,
          },
        })
      : [],
    listContacts(s.companyId!, "CUSTOMER"),
    db.ledger.findMany({
      where: {
        companyId: s.companyId!, deletedAt: null, isActive: true,
        accountGroup: { accountHead: { code: "CCE" } },
      },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.salesDoc.findMany({
      where: {
        companyId: s.companyId!, type: "INVOICE",
        status: { in: ["OPEN", "PARTIALLY_PAID", "RETURNED"] },
        customerLedgerId: { not: null },
      },
      select: { id: true, number: true, customerLedgerId: true, grandTotal: true, amountPaid: true },
      orderBy: { date: "desc" },
    }),
  ]);

  return (
    <ReceiptWorkspace
      receipts={receipts.map((r) => ({
        id: r.id, number: r.number, date: r.date.toISOString().slice(0, 10),
        amount: r.amount.toFixed(2), paymentMode: r.paymentMode,
        against: r.againstDoc?.number ?? "On account", reference: r.reference ?? "—",
      }))}
      customers={customers.map((c) => ({ id: c.id, name: c.name }))}
      cashBank={cashBank}
      openInvoices={openInvoices.map((i) => ({
        id: i.id, number: i.number, customerLedgerId: i.customerLedgerId!,
        outstanding: (Number(i.grandTotal) - Number(i.amountPaid)).toFixed(2),
      }))}
      canCreate={can(s.permissions, "sales.receipt", "create")}
    />
  );
}
