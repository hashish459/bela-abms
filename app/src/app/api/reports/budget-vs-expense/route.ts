import { ok, handler, errors } from "@/lib/api";
import { guard } from "@/lib/guard";
import { budgetVsExpenseReport } from "@/server/budget/service";

export const GET = handler(async (req: Request) => {
  const { companyId } = await guard("reports.budget_reports", "read");
  const url = new URL(req.url);
  const budgetId = url.searchParams.get("budgetId");
  if (!budgetId) throw errors.badRequest("budgetId is required");
  return ok(await budgetVsExpenseReport(companyId, budgetId));
});
