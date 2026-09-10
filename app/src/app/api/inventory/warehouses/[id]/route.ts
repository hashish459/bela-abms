import { ok, handler } from "@/lib/api";
import { guard } from "@/lib/guard";
import { warehouseUpdate } from "@/server/inventory/schemas";
import { updateWarehouse } from "@/server/inventory/service";

export const PATCH = handler(
  async (req: Request, ctx: RouteContext<"/api/inventory/warehouses/[id]">) => {
    const { companyId, session } = await guard("inventory.warehouse", "update");
    const { id } = await ctx.params;
    const input = warehouseUpdate.parse(await req.json());
    return ok({ warehouse: await updateWarehouse(companyId, session.id, id, input) });
  },
);
