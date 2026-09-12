import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { stockMovementLedger } from "@/server/inventory/stock";
import { listWarehouses } from "@/server/inventory/service";
import { InventoryTransferWorkspace } from "./inventory-transfer-workspace";

export const metadata = { title: "Inventory Transfer — Bela ABMS" };

export default async function InventoryTransferPage() {
  const s = (await getSession())!;
  if (!can(s.permissions, "inventory.inventory_transfer", "read")) redirect("/dashboard");

  const [initial, warehouses] = await Promise.all([
    stockMovementLedger(s.companyId!, { page: 1 }),
    listWarehouses(s.companyId!),
  ]);

  return (
    <InventoryTransferWorkspace
      initial={initial}
      warehouses={warehouses.map((w) => ({ id: w.id, name: w.name }))}
    />
  );
}
