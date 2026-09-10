import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { TabNav } from "@/components/tab-nav";

const TABS = [
  { title: "Product Category", href: "/dashboard/inventory/product-category", perm: "inventory.product_category" },
  { title: "Products", href: "/dashboard/inventory/products", perm: "inventory.product_item" },
  { title: "Units of Measurement", href: "/dashboard/inventory/unit-measurement", perm: "inventory.units_of_measurement" },
  { title: "Warehouse", href: "/dashboard/inventory/warehouse", perm: "inventory.warehouse" },
  { title: "Warehouse Transfer", href: "/dashboard/inventory/warehouse-transfer", perm: "inventory.warehouse_transfer" },
  { title: "Inventory Adjustment", href: "/dashboard/inventory/inventory-adjustment", perm: "inventory.inventory_adjustment" },
  { title: "Inventory Transfer", href: "/dashboard/inventory/inventory-transfer", perm: "inventory.inventory_transfer" },
];

export default async function InventoryLayout({ children }: LayoutProps<"/">) {
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
