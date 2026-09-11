import { ok, handler } from "@/lib/api";
import { guard } from "@/lib/guard";
import { getPurchaseDoc } from "@/server/purchase/service";

export const GET = handler(
  async (_req: Request, ctx: RouteContext<"/api/purchase/invoices/[id]">) => {
    const { companyId } = await guard("purchase.purchase_invoice", "read");
    const { id } = await ctx.params;
    return ok({ doc: await getPurchaseDoc(companyId, id) });
  },
);
