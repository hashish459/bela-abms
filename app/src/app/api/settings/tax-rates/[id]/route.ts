import { ok, errors, handler } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { taxRateUpdate } from "@/server/settings/schemas";
import { deleteTaxRate, updateTaxRate } from "@/server/settings/service";

export const PATCH = handler(
  async (req: Request, ctx: RouteContext<"/api/settings/tax-rates/[id]">) => {
    const s = await requireSession();
    requirePermission(s.permissions, "settings.tax", "update");
    if (!s.companyId) throw errors.badRequest("No active company");
    const { id } = await ctx.params;
    const input = taxRateUpdate.parse(await req.json());
    return ok({ taxRate: await updateTaxRate(s.companyId, s.id, id, input) });
  },
);

export const DELETE = handler(
  async (_req: Request, ctx: RouteContext<"/api/settings/tax-rates/[id]">) => {
    const s = await requireSession();
    requirePermission(s.permissions, "settings.tax", "delete");
    if (!s.companyId) throw errors.badRequest("No active company");
    const { id } = await ctx.params;
    await deleteTaxRate(s.companyId, s.id, id);
    return ok({ deleted: true });
  },
);
