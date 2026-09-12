import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { db } from "@/lib/db";
import { listBankAccounts, listBanks } from "@/server/settings/service";
import { BankDetailManager } from "./bank-detail-manager";

export const metadata = { title: "Bank Detail — Bela ABMS" };

export default async function BankDetailPage() {
  const s = (await getSession())!;
  if (!can(s.permissions, "settings.bank_detail", "read")) redirect("/dashboard");

  const [accounts, banks, ledgers] = await Promise.all([
    listBankAccounts(s.companyId!),
    listBanks(s.companyId!),
    db.ledger.findMany({
      where: { companyId: s.companyId!, deletedAt: null, isActive: true, accountGroup: { accountHead: { code: "CCE" } } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <BankDetailManager
      initial={accounts}
      banks={banks.filter((b) => b.isActive).map((b) => ({ id: b.id, name: b.name }))}
      ledgers={ledgers}
      canCreate={can(s.permissions, "settings.bank_detail", "create")}
      canUpdate={can(s.permissions, "settings.bank_detail", "update")}
      canDelete={can(s.permissions, "settings.bank_detail", "delete")}
    />
  );
}
