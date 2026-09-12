import { ok, handler } from "@/lib/api";
import { guard } from "@/lib/guard";
import { setCustomStatusInput } from "@/server/purchase/schemas";
import { getPurchaseDoc, setPurchaseDocCustomStatus } from "@/server/purchase/service";

export const GET = handler(
  async (_req: Request, ctx: RouteContext<"/api/purchase/invoices/[id]">) => {
    const { companyId } = await guard("purchase.purchase_invoice", "read");
    const { id } = await ctx.params;
    return ok({ doc: await getPurchaseDoc(companyId, id) });
  },
);

export const PATCH = handler(
  async (req: Request, ctx: RouteContext<"/api/purchase/invoices/[id]">) => {
    const { companyId, session } = await guard("purchase.purchase_invoice", "update");
    const { id } = await ctx.params;
    const input = setCustomStatusInput.parse(await req.json());
    await setPurchaseDocCustomStatus(companyId, session.id, id, input.customStatusId);
    return ok({ updated: true });
  },
);
