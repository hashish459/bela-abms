import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { db } from "@/lib/db";
import { listCheques } from "@/server/cheque/service";
import { listContacts } from "@/server/accounts/service";
import { ChequeWorkspace } from "./cheque-workspace";

export const metadata = { title: "Cheque — Bela ABMS" };

export default async function ChequePage() {
  const s = (await getSession())!;
  if (!can(s.permissions, "sales.cheque", "read")) redirect("/dashboard");

  const [list, customers, recentInvoices] = await Promise.all([
    listCheques(s.companyId!, { page: 1 }),
    listContacts(s.companyId!, "CUSTOMER"),
    db.salesDoc.findMany({
      where: { companyId: s.companyId!, type: "INVOICE" },
      orderBy: { date: "desc" },
      take: 30,
      select: { id: true, number: true, customerName: true },
    }),
  ]);

  return (
    <ChequeWorkspace
      initial={list}
      customers={customers.map((c) => ({ id: c.id, name: c.name }))}
      recentInvoices={recentInvoices.map((i) => ({ id: i.id, label: `${i.number} — ${i.customerName ?? "Cash sale"}` }))}
      canCreate={can(s.permissions, "sales.cheque", "create")}
      canUpdate={can(s.permissions, "sales.cheque", "update")}
    />
  );
}
