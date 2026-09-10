import { ok, handler } from "@/lib/api";
import { guard } from "@/lib/guard";
import { activeFiscalYearId } from "@/lib/fiscal-year";
import { trialBalance } from "@/server/accounts/gl";

export const GET = handler(async (req: Request) => {
  const { companyId } = await guard("reports.accounting_reports", "read");
  const url = new URL(req.url);
  const asOf = url.searchParams.get("asOf");
  const fyId = await activeFiscalYearId(companyId);
  const tb = await trialBalance(companyId, fyId, {
    asOf: asOf ? new Date(asOf) : undefined,
  });
  return ok(tb);
});
