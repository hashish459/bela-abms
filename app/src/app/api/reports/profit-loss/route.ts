import { ok, handler } from "@/lib/api";
import { guard } from "@/lib/guard";
import { activeFiscalYear } from "@/lib/fiscal-year";
import { profitAndLoss } from "@/server/reports/service";

export const GET = handler(async (req: Request) => {
  const { companyId } = await guard("reports.accounting_reports", "read");
  const url = new URL(req.url);
  const fy = await activeFiscalYear(companyId);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const pl = await profitAndLoss(companyId, fy.id, {
    from: from ? new Date(from) : fy.startDate,
    to: to ? new Date(to) : fy.endDate,
  });
  return ok({ ...pl, fyName: fy.name });
});
