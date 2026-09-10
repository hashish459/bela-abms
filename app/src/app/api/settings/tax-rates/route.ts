import { ok, errors, handler } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { taxRateCreate } from "@/server/settings/schemas";
import { createTaxRate, listTaxRates } from "@/server/settings/service";

export const GET = handler(async () => {
  const s = await requireSession();
  requirePermission(s.permissions, "settings.tax", "read");
  if (!s.companyId) throw errors.badRequest("No active company");
  return ok({ taxRates: await listTaxRates(s.companyId) });
});

export const POST = handler(async (req: Request) => {
  const s = await requireSession();
  requirePermission(s.permissions, "settings.tax", "create");
  if (!s.companyId) throw errors.badRequest("No active company");
  const input = taxRateCreate.parse(await req.json());
  const created = await createTaxRate(s.companyId, s.id, input);
  return ok({ taxRate: created }, { status: 201 });
});
