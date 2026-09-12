import { ok, handler } from "@/lib/api";
import { guard } from "@/lib/guard";
import { balanceConfirmationStatusUpdate } from "@/server/balance-confirmation/schemas";
import { updateBalanceConfirmationStatus } from "@/server/balance-confirmation/service";

export const PATCH = handler(
  async (req: Request, ctx: RouteContext<"/api/accounts/balance-confirmation/[id]">) => {
    const { companyId, session } = await guard("accounts.balance_confirmation", "update");
    const { id } = await ctx.params;
    const input = balanceConfirmationStatusUpdate.parse(await req.json());
    await updateBalanceConfirmationStatus(companyId, session.id, id, input);
    return ok({ id });
  },
);
