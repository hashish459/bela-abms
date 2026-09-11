import { ok, handler } from "@/lib/api";
import { guard } from "@/lib/guard";
import { getProductionOrder } from "@/server/manufacturing/service";

export const GET = handler(async (_req: Request, ctx: RouteContext<"/api/manufacturing/production-orders/[id]">) => {
  const { companyId } = await guard("manufacturing.production_order", "read");
  const { id } = await ctx.params;
  return ok({ order: await getProductionOrder(companyId, id) });
});
