import { ok, handler, errors } from "@/lib/api";
import { guard } from "@/lib/guard";
import { activeFiscalYearId } from "@/lib/fiscal-year";
import { dayBook } from "@/server/reports/service";

export const GET = handler(async (req: Request) => {
  const { companyId } = await guard("reports.accounting_reports", "read");
  const url = new URL(req.url);
  const date = url.searchParams.get("date");
  if (!date) throw errors.badRequest("date is required");
  const fyId = await activeFiscalYearId(companyId);
  const day = new Date(date);
  const data = await dayBook(companyId, fyId, { from: day, to: day });
  return ok(data);
});
