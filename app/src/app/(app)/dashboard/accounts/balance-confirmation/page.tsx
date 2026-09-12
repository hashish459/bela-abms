import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { listBalanceConfirmations } from "@/server/balance-confirmation/service";
import { listContacts } from "@/server/accounts/service";
import { BalanceConfirmationWorkspace } from "./balance-confirmation-workspace";

export const metadata = { title: "Balance Confirmation — Bela ABMS" };

export default async function BalanceConfirmationPage() {
  const s = (await getSession())!;
  if (!can(s.permissions, "accounts.balance_confirmation", "read")) redirect("/dashboard");

  const [list, customers, suppliers] = await Promise.all([
    listBalanceConfirmations(s.companyId!, { page: 1 }),
    listContacts(s.companyId!, "CUSTOMER"),
    listContacts(s.companyId!, "SUPPLIER"),
  ]);
  const byId = new Map([...customers, ...suppliers].map((c) => [c.id, c.name]));
  const accounts = [...byId.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <BalanceConfirmationWorkspace
      initial={list}
      accounts={accounts}
      canCreate={can(s.permissions, "accounts.balance_confirmation", "create")}
      canUpdate={can(s.permissions, "accounts.balance_confirmation", "update")}
    />
  );
}
