import { ok, handler } from "@/lib/api";
import { guard } from "@/lib/guard";
import { setCustomStatusInput } from "@/server/sales/schemas";
import { getSalesDoc, setSalesDocCustomStatus } from "@/server/sales/service";

export const GET = handler(
  async (_req: Request, ctx: RouteContext<"/api/sales/invoices/[id]">) => {
    const { companyId } = await guard("sales.sales_invoice", "read");
    const { id } = await ctx.params;
    return ok({ doc: await getSalesDoc(companyId, id) });
  },
);

export const PATCH = handler(
  async (req: Request, ctx: RouteContext<"/api/sales/invoices/[id]">) => {
    const { companyId, session } = await guard("sales.sales_invoice", "update");
    const { id } = await ctx.params;
    const input = setCustomStatusInput.parse(await req.json());
    await setSalesDocCustomStatus(companyId, session.id, id, input.customStatusId);
    return ok({ updated: true });
  },
);
