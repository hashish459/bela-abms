import { ok, handler } from "@/lib/api";
import { guard } from "@/lib/guard";
import { convertInput } from "@/server/purchase/schemas";
import { convertPurchaseOrder } from "@/server/purchase/service";

export const POST = handler(
  async (req: Request, ctx: RouteContext<"/api/purchase/docs/[id]/convert">) => {
    const { companyId } = await guard("purchase.purchase_invoice", "create");
    const { id } = await ctx.params;
    convertInput.parse(await req.json());
    return ok(await convertPurchaseOrder(companyId, id));
  },
);
