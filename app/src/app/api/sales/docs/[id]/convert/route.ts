import { ok, handler } from "@/lib/api";
import { guard } from "@/lib/guard";
import { convertInput } from "@/server/sales/schemas";
import { convertDoc } from "@/server/sales/service";

export const POST = handler(
  async (req: Request, ctx: RouteContext<"/api/sales/docs/[id]/convert">) => {
    const { companyId } = await guard("sales.sales_invoice", "create");
    const { id } = await ctx.params;
    const { toType } = convertInput.parse(await req.json());
    return ok(await convertDoc(companyId, id, toType));
  },
);
