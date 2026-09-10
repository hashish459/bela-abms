import { ok, handler } from "@/lib/api";
import { guard } from "@/lib/guard";
import { warehouseCreate } from "@/server/inventory/schemas";
import { createWarehouse, listWarehouses } from "@/server/inventory/service";

export const GET = handler(async () => {
  const { companyId } = await guard("inventory.warehouse", "read");
  return ok({ warehouses: await listWarehouses(companyId) });
});

export const POST = handler(async (req: Request) => {
  const { companyId, session } = await guard("inventory.warehouse", "create");
  const input = warehouseCreate.parse(await req.json());
  return ok({ warehouse: await createWarehouse(companyId, session.id, input) }, { status: 201 });
});
