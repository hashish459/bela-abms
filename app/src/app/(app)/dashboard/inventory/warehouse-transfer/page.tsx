import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { activeFiscalYearId } from "@/lib/fiscal-year";
import { listWarehouseTransfers } from "@/server/warehouse-transfer/service";
import { listWarehouses } from "@/server/inventory/service";
import { WarehouseTransferWorkspace } from "./warehouse-transfer-workspace";

export const metadata = { title: "Warehouse Transfer — Bela ABMS" };

export default async function WarehouseTransferPage() {
  const s = (await getSession())!;
  if (!can(s.permissions, "inventory.warehouse_transfer", "read")) redirect("/dashboard");
  const fyId = await activeFiscalYearId(s.companyId!).catch(() => null);

  const [list, warehouses] = await Promise.all([
    listWarehouseTransfers(s.companyId!, fyId, { page: 1 }),
    listWarehouses(s.companyId!),
  ]);

  return (
    <WarehouseTransferWorkspace
      initial={list}
      warehouses={warehouses.map((w) => ({ id: w.id, name: w.name }))}
      canCreate={can(s.permissions, "inventory.warehouse_transfer", "create")}
    />
  );
}
