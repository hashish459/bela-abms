import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { db } from "@/lib/db";
import { activeFiscalYearId } from "@/lib/fiscal-year";
import { listChalanis } from "@/server/chalani/service";
import { listContacts } from "@/server/accounts/service";
import { ChalaniWorkspace } from "./chalani-workspace";

export const metadata = { title: "Chalani — Bela ABMS" };

export default async function ChalaniPage() {
  const s = (await getSession())!;
  if (!can(s.permissions, "sales.chalani", "read")) redirect("/dashboard");
  const fyId = await activeFiscalYearId(s.companyId!).catch(() => null);

  const [list, customers, recentInvoices] = await Promise.all([
    listChalanis(s.companyId!, fyId, { page: 1 }),
    listContacts(s.companyId!, "CUSTOMER"),
    db.salesDoc.findMany({
      where: { companyId: s.companyId!, type: "INVOICE" },
      orderBy: { date: "desc" },
      take: 30,
      select: { id: true, number: true, customerName: true },
    }),
  ]);

  return (
    <ChalaniWorkspace
      initial={list}
      customers={customers.map((c) => ({ id: c.id, name: c.name }))}
      recentInvoices={recentInvoices.map((i) => ({ id: i.id, label: `${i.number} — ${i.customerName ?? "Cash sale"}` }))}
      canCreate={can(s.permissions, "sales.chalani", "create")}
    />
  );
}
