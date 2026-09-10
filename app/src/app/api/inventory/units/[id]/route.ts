import { ok, handler } from "@/lib/api";
import { guard } from "@/lib/guard";
import { unitUpdate } from "@/server/inventory/schemas";
import { updateUnit } from "@/server/inventory/service";

export const PATCH = handler(
  async (req: Request, ctx: RouteContext<"/api/inventory/units/[id]">) => {
    const { companyId, session } = await guard("inventory.units_of_measurement", "update");
    const { id } = await ctx.params;
    const input = unitUpdate.parse(await req.json());
    return ok({ unit: await updateUnit(companyId, session.id, id, input) });
  },
);
