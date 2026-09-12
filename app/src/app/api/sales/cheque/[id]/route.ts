import { ok, handler } from "@/lib/api";
import { guard } from "@/lib/guard";
import { chequeStatusUpdate } from "@/server/cheque/schemas";
import { updateChequeStatus } from "@/server/cheque/service";

export const PATCH = handler(
  async (req: Request, ctx: RouteContext<"/api/sales/cheque/[id]">) => {
    const { companyId, session } = await guard("sales.cheque", "update");
    const { id } = await ctx.params;
    const input = chequeStatusUpdate.parse(await req.json());
    await updateChequeStatus(companyId, session.id, id, input);
    return ok({ id });
  },
);
