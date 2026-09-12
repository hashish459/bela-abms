import { ok, handler } from "@/lib/api";
import { guard } from "@/lib/guard";
import { budgetCreate } from "@/server/budget/schemas";
import { createBudget, listBudgets } from "@/server/budget/service";

export const GET = handler(async () => {
  const { companyId } = await guard("budget.budget", "read");
  return ok({ budgets: await listBudgets(companyId) });
});

export const POST = handler(async (req: Request) => {
  const { companyId, session } = await guard("budget.budget", "create");
  const input = budgetCreate.parse(await req.json());
  const created = await createBudget(companyId, session.id, input);
  return ok({ budget: { id: created.id } }, { status: 201 });
});
