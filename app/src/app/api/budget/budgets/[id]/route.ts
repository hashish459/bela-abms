import { ok, handler } from "@/lib/api";
import { guard } from "@/lib/guard";
import { budgetUpdate } from "@/server/budget/schemas";
import { deleteBudget, updateBudget } from "@/server/budget/service";

export const PATCH = handler(
  async (req: Request, ctx: RouteContext<"/api/budget/budgets/[id]">) => {
    const { companyId, session } = await guard("budget.budget", "update");
    const { id } = await ctx.params;
    const input = budgetUpdate.parse(await req.json());
    await updateBudget(companyId, session.id, id, input);
    return ok({ updated: true });
  },
);

export const DELETE = handler(
  async (_req: Request, ctx: RouteContext<"/api/budget/budgets/[id]">) => {
    const { companyId, session } = await guard("budget.budget", "delete");
    const { id } = await ctx.params;
    await deleteBudget(companyId, session.id, id);
    return ok({ deleted: true });
  },
);
