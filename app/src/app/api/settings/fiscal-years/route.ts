import { ok, handler } from "@/lib/api";
import { guard } from "@/lib/guard";
import { fiscalYearCreate } from "@/server/settings/schemas";
import { createFiscalYear, listFiscalYears } from "@/server/settings/service";

export const GET = handler(async () => {
  const { companyId } = await guard("settings.fiscal_year", "read");
  return ok({ fiscalYears: await listFiscalYears(companyId) });
});

export const POST = handler(async (req: Request) => {
  const { companyId, session } = await guard("settings.fiscal_year", "create");
  const input = fiscalYearCreate.parse(await req.json());
  const created = await createFiscalYear(companyId, session.id, input);
  return ok({ fiscalYear: created }, { status: 201 });
});
