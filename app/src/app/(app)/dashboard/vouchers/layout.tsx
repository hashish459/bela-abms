import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { TabNav } from "@/components/tab-nav";

const TABS = [
  { title: "Journal Voucher", href: "/dashboard/vouchers/journal-voucher", perm: "vouchers.journal_voucher" },
  { title: "Contra Voucher", href: "/dashboard/vouchers/contra-voucher", perm: "vouchers.contra_voucher" },
  { title: "Stock Journal", href: "/dashboard/vouchers/stock-journal", perm: "vouchers.stock_journal" },
];

export default async function VouchersLayout({ children }: LayoutProps<"/">) {
  const s = (await getSession())!;
  const tabs = TABS.filter((t) => can(s.permissions, t.perm, "read")).map(
    ({ title, href }) => ({ title, href }),
  );
  return (
    <div className="space-y-4">
      <TabNav tabs={tabs} />
      {children}
    </div>
  );
}
