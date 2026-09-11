import { ok, handler } from "@/lib/api";
import { guard } from "@/lib/guard";
import { activeFiscalYear } from "@/lib/fiscal-year";
import { balanceSheet } from "@/server/reports/service";

export const GET = handler(async (req: Request) => {
  const { companyId } = await guard("reports.accounting_reports", "read");
  const url = new URL(req.url);
  const asOf = url.searchParams.get("asOf");
  const fy = await activeFiscalYear(companyId);
  const bs = await balanceSheet(companyId, fy.id, { asOf: asOf ? new Date(asOf) : undefined });
  return ok({ ...bs, fyName: fy.name });
});
