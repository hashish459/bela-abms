import { ok, handler } from "@/lib/api";
import { guard } from "@/lib/guard";
import { getVoucher } from "@/server/accounts/service";

export const GET = handler(
  async (_req: Request, ctx: RouteContext<"/api/accounts/vouchers/[id]">) => {
    const { companyId } = await guard("vouchers.journal_voucher", "read");
    const { id } = await ctx.params;
    return ok({ voucher: await getVoucher(companyId, id) });
  },
);
