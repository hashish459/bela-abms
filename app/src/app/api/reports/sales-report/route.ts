import { ok, handler, errors } from "@/lib/api";
import { guard } from "@/lib/guard";
import { activeFiscalYearId } from "@/lib/fiscal-year";
import { salesReport } from "@/server/reports/service";

export const GET = handler(async (req: Request) => {
  const { companyId } = await guard("reports.sales_reports", "read");
  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const type = url.searchParams.get("type") ?? "INVOICE";
  if (!from || !to) throw errors.badRequest("from and to are required");
  if (type !== "INVOICE" && type !== "CREDIT_NOTE") throw errors.badRequest("type must be INVOICE or CREDIT_NOTE");
  const fyId = await activeFiscalYearId(companyId);
  const data = await salesReport(companyId, fyId, type, { from: new Date(from), to: new Date(to) });
  return ok(data);
});
