import { ok, handler } from "@/lib/api";
import { guard } from "@/lib/guard";
import { budgetFundCreate } from "@/server/budget/schemas";
import { createBudgetFund, listBudgetFunds } from "@/server/budget/service";

export const GET = handler(async () => {
  const { companyId } = await guard("budget.fund", "read");
  return ok({ funds: await listBudgetFunds(companyId) });
});

export const POST = handler(async (req: Request) => {
  const { companyId, session } = await guard("budget.fund", "create");
  const input = budgetFundCreate.parse(await req.json());
  const created = await createBudgetFund(companyId, session.id, input);
  return ok({ fund: created }, { status: 201 });
});
