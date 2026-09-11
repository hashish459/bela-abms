import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { TabNav } from "@/components/tab-nav";

const TABS = [
  { title: "Trial Balance", href: "/dashboard/reports/accounting/trial-balance", perm: "reports.accounting_reports" },
  { title: "Ledger", href: "/dashboard/reports/accounting/ledger", perm: "reports.accounting_reports" },
  { title: "Profit & Loss", href: "/dashboard/reports/accounting/profit-loss", perm: "reports.accounting_reports" },
  { title: "Balance Sheet", href: "/dashboard/reports/accounting/balance-sheet", perm: "reports.accounting_reports" },
  { title: "Day Book", href: "/dashboard/reports/accounting/day-book", perm: "reports.accounting_reports" },
  { title: "VAT Return", href: "/dashboard/reports/tax/vat-return", perm: "reports.tax_reports" },
  { title: "Receivable Aging", href: "/dashboard/reports/receivable/aging", perm: "reports.receivable_reports" },
  { title: "Payable Aging", href: "/dashboard/reports/payable/aging", perm: "reports.payable_reports" },
  { title: "Stock Summary", href: "/dashboard/reports/inventory/stock-summary", perm: "reports.inventory_reports" },
];

export default async function ReportsLayout({ children }: LayoutProps<"/">) {
  const s = (await getSession())!;
  const tabs = TABS.filter((t) => can(s.permissions, t.perm, "read")).map(({ title, href }) => ({ title, href }));
  return (
    <div className="space-y-4">
      <TabNav tabs={tabs} />
      {children}
    </div>
  );
}
