import { ok, handler } from "@/lib/api";
import { guard } from "@/lib/guard";
import { budgetFundUpdate } from "@/server/budget/schemas";
import { deleteBudgetFund, updateBudgetFund } from "@/server/budget/service";

export const PATCH = handler(
  async (req: Request, ctx: RouteContext<"/api/budget/funds/[id]">) => {
    const { companyId, session } = await guard("budget.fund", "update");
    const { id } = await ctx.params;
    const input = budgetFundUpdate.parse(await req.json());
    await updateBudgetFund(companyId, session.id, id, input);
    return ok({ updated: true });
  },
);

export const DELETE = handler(
  async (_req: Request, ctx: RouteContext<"/api/budget/funds/[id]">) => {
    const { companyId, session } = await guard("budget.fund", "delete");
    const { id } = await ctx.params;
    await deleteBudgetFund(companyId, session.id, id);
    return ok({ deleted: true });
  },
);
