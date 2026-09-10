import { ok, handler } from "@/lib/api";
import { guard } from "@/lib/guard";
import { getSalesDoc } from "@/server/sales/service";

export const GET = handler(
  async (_req: Request, ctx: RouteContext<"/api/sales/invoices/[id]">) => {
    const { companyId } = await guard("sales.sales_invoice", "read");
    const { id } = await ctx.params;
    return ok({ doc: await getSalesDoc(companyId, id) });
  },
);
