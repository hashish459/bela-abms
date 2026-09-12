import { ok, handler } from "@/lib/api";
import { guard } from "@/lib/guard";
import { allocationSet } from "@/server/budget/schemas";
import { getBudgetAllocations, setBudgetAllocations } from "@/server/budget/service";

export const GET = handler(
  async (_req: Request, ctx: RouteContext<"/api/budget/budgets/[id]/allocations">) => {
    const { companyId } = await guard("budget.allocation", "read");
    const { id } = await ctx.params;
    return ok(await getBudgetAllocations(companyId, id));
  },
);

export const PUT = handler(
  async (req: Request, ctx: RouteContext<"/api/budget/budgets/[id]/allocations">) => {
    const { companyId, session } = await guard("budget.allocation", "update");
    const { id } = await ctx.params;
    const input = allocationSet.parse(await req.json());
    await setBudgetAllocations(companyId, session.id, id, input);
    return ok({ updated: true });
  },
);
