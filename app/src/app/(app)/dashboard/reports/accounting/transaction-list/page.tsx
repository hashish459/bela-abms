import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { db } from "@/lib/db";
import { TransactionListView } from "@/components/transaction-list-view";

export const metadata = { title: "Transaction List — Bela ABMS" };

export default async function TransactionListPage() {
  const s = (await getSession())!;
  if (!can(s.permissions, "reports.accounting_reports", "read")) redirect("/dashboard");

  const ledgers = await db.ledger.findMany({
    where: { companyId: s.companyId!, deletedAt: null },
    select: { id: true, name: true, code: true },
    orderBy: { code: "asc" },
  });

  return <TransactionListView ledgers={ledgers} />;
}
