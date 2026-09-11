import { ok, handler, errors } from "@/lib/api";
import { guard } from "@/lib/guard";
import { activeFiscalYearId } from "@/lib/fiscal-year";
import { salesProfitReport } from "@/server/reports/service";

export const GET = handler(async (req: Request) => {
  const { companyId } = await guard("reports.sales_reports", "read");
  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  if (!from || !to) throw errors.badRequest("from and to are required");
  const fyId = await activeFiscalYearId(companyId);
  const data = await salesProfitReport(companyId, fyId, { from: new Date(from), to: new Date(to) });
  return ok(data);
});
