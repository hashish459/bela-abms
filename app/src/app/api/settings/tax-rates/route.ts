import { ok, handler } from "@/lib/api";
import { guard } from "@/lib/guard";
import { taxRateCreate } from "@/server/settings/schemas";
import { createTaxRate, listTaxRates } from "@/server/settings/service";

export const GET = handler(async () => {
  const { companyId } = await guard("settings.tax", "read");
  return ok({ taxRates: await listTaxRates(companyId) });
});

export const POST = handler(async (req: Request) => {
  const { companyId, session } = await guard("settings.tax", "create");
  const input = taxRateCreate.parse(await req.json());
  const created = await createTaxRate(companyId, session.id, input);
  return ok({ taxRate: created }, { status: 201 });
});
