import { ok, errors, handler } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { fiscalYearCreate } from "@/server/settings/schemas";
import { createFiscalYear, listFiscalYears } from "@/server/settings/service";

export const GET = handler(async () => {
  const s = await requireSession();
  requirePermission(s.permissions, "settings.fiscal_year", "read");
  if (!s.companyId) throw errors.badRequest("No active company");
  return ok({ fiscalYears: await listFiscalYears(s.companyId) });
});

export const POST = handler(async (req: Request) => {
  const s = await requireSession();
  requirePermission(s.permissions, "settings.fiscal_year", "create");
  if (!s.companyId) throw errors.badRequest("No active company");
  const input = fiscalYearCreate.parse(await req.json());
  const created = await createFiscalYear(s.companyId, s.id, input);
  return ok({ fiscalYear: created }, { status: 201 });
});
