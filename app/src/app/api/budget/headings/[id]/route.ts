import { ok, handler } from "@/lib/api";
import { guard } from "@/lib/guard";
import { budgetHeadingUpdate } from "@/server/budget/schemas";
import { deleteBudgetHeading, updateBudgetHeading } from "@/server/budget/service";

export const PATCH = handler(
  async (req: Request, ctx: RouteContext<"/api/budget/headings/[id]">) => {
    const { companyId, session } = await guard("budget.budget_heading", "update");
    const { id } = await ctx.params;
    const input = budgetHeadingUpdate.parse(await req.json());
    await updateBudgetHeading(companyId, session.id, id, input);
    return ok({ updated: true });
  },
);

export const DELETE = handler(
  async (_req: Request, ctx: RouteContext<"/api/budget/headings/[id]">) => {
    const { companyId, session } = await guard("budget.budget_heading", "delete");
    const { id } = await ctx.params;
    await deleteBudgetHeading(companyId, session.id, id);
    return ok({ deleted: true });
  },
);
