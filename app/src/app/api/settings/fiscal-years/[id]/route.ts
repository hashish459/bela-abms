import { ok, errors, handler } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { fiscalYearUpdate } from "@/server/settings/schemas";
import { updateFiscalYear } from "@/server/settings/service";

export const PATCH = handler(
  async (req: Request, ctx: RouteContext<"/api/settings/fiscal-years/[id]">) => {
    const s = await requireSession();
    requirePermission(s.permissions, "settings.fiscal_year", "update");
    if (!s.companyId) throw errors.badRequest("No active company");
    const { id } = await ctx.params;
    const input = fiscalYearUpdate.parse(await req.json());
    const updated = await updateFiscalYear(s.companyId, s.id, id, input);
    return ok({ fiscalYear: updated });
  },
);
