import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { chartOfAccounts, listGroups } from "@/server/accounts/service";
import { ChartOfAccounts } from "./chart-of-accounts";

export const metadata = { title: "Chart of Accounts — Bela ABMS" };

export default async function ChartOfAccountsPage() {
  const s = (await getSession())!;
  if (!can(s.permissions, "accounts.charts_of_accounts", "read")) redirect("/dashboard");

  const [heads, groups] = await Promise.all([
    chartOfAccounts(s.companyId!),
    listGroups(s.companyId!),
  ]);

  return (
    <ChartOfAccounts
      heads={heads}
      groups={groups}
      canCreate={can(s.permissions, "accounts.charts_of_accounts", "create")}
      canDelete={can(s.permissions, "accounts.charts_of_accounts", "delete")}
    />
  );
}
