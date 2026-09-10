import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { listAdjustments, listWarehouses } from "@/server/inventory/service";
import { AdjustmentWorkspace } from "./adjustment-workspace";

export const metadata = { title: "Inventory Adjustment — Bela ABMS" };

export default async function InventoryAdjustmentPage() {
  const s = (await getSession())!;
  if (!can(s.permissions, "inventory.inventory_adjustment", "read")) redirect("/dashboard");
  const [list, warehouses] = await Promise.all([
    listAdjustments(s.companyId!, 1),
    listWarehouses(s.companyId!),
  ]);
  return (
    <AdjustmentWorkspace
      initial={list}
      warehouses={warehouses.map((w) => ({ id: w.id, name: w.name }))}
      canCreate={can(s.permissions, "inventory.inventory_adjustment", "create")}
    />
  );
}
