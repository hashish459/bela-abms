import { ok, handler } from "@/lib/api";
import { guard } from "@/lib/guard";
import { ledgerUpdate } from "@/server/accounts/schemas";
import { deleteLedger, updateLedger } from "@/server/accounts/service";

export const PATCH = handler(
  async (req: Request, ctx: RouteContext<"/api/accounts/ledgers/[id]">) => {
    const { companyId, session } = await guard("accounts.charts_of_accounts", "update");
    const { id } = await ctx.params;
    const input = ledgerUpdate.parse(await req.json());
    return ok({ ledger: await updateLedger(companyId, session.id, id, input) });
  },
);

export const DELETE = handler(
  async (_req: Request, ctx: RouteContext<"/api/accounts/ledgers/[id]">) => {
    const { companyId, session } = await guard("accounts.charts_of_accounts", "delete");
    const { id } = await ctx.params;
    await deleteLedger(companyId, session.id, id);
    return ok({ deleted: true });
  },
);
