import { ok, handler, errors } from "@/lib/api";
import { guard } from "@/lib/guard";
import { activeFiscalYear } from "@/lib/fiscal-year";
import { vatReturn } from "@/server/reports/service";

export const GET = handler(async (req: Request) => {
  const { companyId } = await guard("reports.tax_reports", "read");
  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  if (!from || !to) throw errors.badRequest("from and to are required");
  const fy = await activeFiscalYear(companyId);
  const data = await vatReturn(companyId, fy.id, { from: new Date(from), to: new Date(to) });
  return ok(data);
});
