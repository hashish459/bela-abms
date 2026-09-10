import { ok, handler } from "@/lib/api";
import { guard } from "@/lib/guard";
import { activeFiscalYearId } from "@/lib/fiscal-year";
import { ledgerStatement } from "@/server/accounts/gl";

export const GET = handler(
  async (_req: Request, ctx: RouteContext<"/api/reports/ledger/[id]">) => {
    const { companyId } = await guard("reports.accounting_reports", "read");
    const { id } = await ctx.params;
    const fyId = await activeFiscalYearId(companyId);
    return ok(await ledgerStatement(companyId, fyId, id));
  },
);
