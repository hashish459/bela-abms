import { ok, errors, handler } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { companyInfoUpdate } from "@/server/settings/schemas";
import { getCompanyInfo, upsertCompanyInfo } from "@/server/settings/service";

export const GET = handler(async () => {
  const s = await requireSession();
  requirePermission(s.permissions, "settings.company_info", "read");
  if (!s.companyId) throw errors.badRequest("No active company");
  return ok({ companyInfo: await getCompanyInfo(s.companyId) });
});

export const PUT = handler(async (req: Request) => {
  const s = await requireSession();
  requirePermission(s.permissions, "settings.company_info", "update");
  if (!s.companyId) throw errors.badRequest("No active company");
  const input = companyInfoUpdate.parse(await req.json());
  return ok({ companyInfo: await upsertCompanyInfo(s.companyId, s.id, input) });
});
