import { ok, handler, errors } from "@/lib/api";
import { guard } from "@/lib/guard";
import { activeFiscalYearId } from "@/lib/fiscal-year";
import { transactionList } from "@/server/reports/service";

export const GET = handler(async (req: Request) => {
  const { companyId } = await guard("reports.accounting_reports", "read");
  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  if (!from || !to) throw errors.badRequest("from and to are required");
  const fyId = await activeFiscalYearId(companyId);
  const page = Number(url.searchParams.get("page") ?? "1");
  const data = await transactionList(companyId, fyId, {
    from: new Date(from),
    to: new Date(to),
    ledgerId: url.searchParams.get("ledgerId") ?? undefined,
    page,
  });
  return ok(data);
});
