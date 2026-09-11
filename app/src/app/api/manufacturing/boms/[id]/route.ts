import { ok, handler } from "@/lib/api";
import { guard } from "@/lib/guard";
import { getBom } from "@/server/manufacturing/service";

export const GET = handler(async (_req: Request, ctx: RouteContext<"/api/manufacturing/boms/[id]">) => {
  const { companyId } = await guard("manufacturing.bill_of_materials", "read");
  const { id } = await ctx.params;
  return ok({ bom: await getBom(companyId, id) });
});
