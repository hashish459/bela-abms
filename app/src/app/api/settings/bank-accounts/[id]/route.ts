import { ok, handler } from "@/lib/api";
import { guard } from "@/lib/guard";
import { bankAccountUpdate } from "@/server/settings/schemas";
import { deleteBankAccount, updateBankAccount } from "@/server/settings/service";

export const PATCH = handler(
  async (req: Request, ctx: RouteContext<"/api/settings/bank-accounts/[id]">) => {
    const { companyId, session } = await guard("settings.bank_detail", "update");
    const { id } = await ctx.params;
    const input = bankAccountUpdate.parse(await req.json());
    await updateBankAccount(companyId, session.id, id, input);
    return ok({ updated: true });
  },
);

export const DELETE = handler(
  async (_req: Request, ctx: RouteContext<"/api/settings/bank-accounts/[id]">) => {
    const { companyId, session } = await guard("settings.bank_detail", "delete");
    const { id } = await ctx.params;
    await deleteBankAccount(companyId, session.id, id);
    return ok({ deleted: true });
  },
);
