import { ok, handler } from "@/lib/api";
import { guard } from "@/lib/guard";
import { activeFiscalYearId } from "@/lib/fiscal-year";
import { depreciationRunCreate } from "@/server/assets/schemas";
import { runDepreciation, listDepreciationRuns } from "@/server/assets/service";

export const GET = handler(async () => {
  const { companyId } = await guard("fixed_assets.depreciation", "read");
  const fyId = await activeFiscalYearId(companyId).catch(() => null);
  return ok({ runs: await listDepreciationRuns(companyId, fyId) });
});

export const POST = handler(async (req: Request) => {
  const { companyId, session } = await guard("fixed_assets.depreciation", "create");
  const input = depreciationRunCreate.parse(await req.json());
  const fyId = await activeFiscalYearId(companyId);
  return ok(await runDepreciation(companyId, fyId, session.id, input));
});
