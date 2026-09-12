import { ok, handler } from "@/lib/api";
import { guard } from "@/lib/guard";
import { budgetHeadingCreate } from "@/server/budget/schemas";
import { createBudgetHeading, listBudgetHeadings } from "@/server/budget/service";

export const GET = handler(async () => {
  const { companyId } = await guard("budget.budget_heading", "read");
  return ok({ headings: await listBudgetHeadings(companyId) });
});

export const POST = handler(async (req: Request) => {
  const { companyId, session } = await guard("budget.budget_heading", "create");
  const input = budgetHeadingCreate.parse(await req.json());
  const created = await createBudgetHeading(companyId, session.id, input);
  return ok({ heading: created }, { status: 201 });
});
