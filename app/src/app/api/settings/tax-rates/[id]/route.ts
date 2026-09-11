import { ok, handler } from "@/lib/api";
import { guard } from "@/lib/guard";
import { taxRateUpdate } from "@/server/settings/schemas";
import { deleteTaxRate, updateTaxRate } from "@/server/settings/service";

export const PATCH = handler(
  async (req: Request, ctx: RouteContext<"/api/settings/tax-rates/[id]">) => {
    const { companyId, session } = await guard("settings.tax", "update");
    const { id } = await ctx.params;
    const input = taxRateUpdate.parse(await req.json());
    return ok({ taxRate: await updateTaxRate(companyId, session.id, id, input) });
  },
);

export const DELETE = handler(
  async (_req: Request, ctx: RouteContext<"/api/settings/tax-rates/[id]">) => {
    const { companyId, session } = await guard("settings.tax", "delete");
    const { id } = await ctx.params;
    await deleteTaxRate(companyId, session.id, id);
    return ok({ deleted: true });
  },
);
