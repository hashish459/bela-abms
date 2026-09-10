import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { TabNav } from "@/components/tab-nav";

const TABS = [
  { title: "Quotation", href: "/dashboard/sales/quotation", perm: "sales.quotation" },
  { title: "Sales Order", href: "/dashboard/sales/sales-order", perm: "sales.sales_order" },
  { title: "Sales Invoice", href: "/dashboard/sales/invoice", perm: "sales.sales_invoice" },
  { title: "Receipts", href: "/dashboard/sales/receipt", perm: "sales.receipt" },
  { title: "Credit Note", href: "/dashboard/sales/credit-note", perm: "sales.credit_note" },
];

export default async function SalesLayout({ children }: LayoutProps<"/">) {
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
