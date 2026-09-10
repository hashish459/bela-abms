import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { TabNav } from "@/components/tab-nav";

const TABS = [
  { title: "Charts of Accounts", href: "/dashboard/accounts/charts-of-accounts", perm: "accounts.charts_of_accounts" },
  { title: "Cash & Bank", href: "/dashboard/accounts/cash-bank", perm: "accounts.cash_and_bank_account" },
  { title: "Contacts", href: "/dashboard/accounts/contacts", perm: "accounts.contacts" },
  { title: "Balance Confirmation", href: "/dashboard/accounts/balance-confirmation", perm: "accounts.balance_confirmation" },
];

export default async function AccountsLayout({ children }: LayoutProps<"/">) {
  const s = (await getSession())!;
  const tabs = TABS.filter((t) => can(s.permissions, t.perm, "read")).map(
    ({ title, href }) => ({ title, href }),
  );
  return (
    <div className="space-y-4">
      <TabNav tabs={tabs} exact={false} />
      {children}
    </div>
  );
}
