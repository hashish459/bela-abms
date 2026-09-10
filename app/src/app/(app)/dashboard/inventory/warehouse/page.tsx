import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { listWarehouses } from "@/server/inventory/service";
import { WarehouseManager } from "./warehouse-manager";

export const metadata = { title: "Warehouse — Bela ABMS" };

export default async function WarehousePage() {
  const s = (await getSession())!;
  if (!can(s.permissions, "inventory.warehouse", "read")) redirect("/dashboard");
  const warehouses = await listWarehouses(s.companyId!);
  return (
    <WarehouseManager
      initial={warehouses}
      canCreate={can(s.permissions, "inventory.warehouse", "create")}
      canUpdate={can(s.permissions, "inventory.warehouse", "update")}
    />
  );
}
