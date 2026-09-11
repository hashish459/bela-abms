import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { TabNav } from "@/components/tab-nav";

const TABS = [
  { title: "Purchase Order", href: "/dashboard/purchase/purchase-order", perm: "purchase.purchase_order" },
  { title: "Purchase Invoice", href: "/dashboard/purchase/purchase-bills", perm: "purchase.purchase_invoice" },
  { title: "Payments", href: "/dashboard/purchase/supplier-payment", perm: "purchase.payment" },
  { title: "Debit Notes", href: "/dashboard/purchase/debit-note", perm: "purchase.debit_notes" },
];

export default async function PurchaseLayout({ children }: LayoutProps<"/">) {
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
