import { ok, handler } from "@/lib/api";
import { guard } from "@/lib/guard";
import { fiscalYearUpdate } from "@/server/settings/schemas";
import { updateFiscalYear } from "@/server/settings/service";

export const PATCH = handler(
  async (req: Request, ctx: RouteContext<"/api/settings/fiscal-years/[id]">) => {
    const { companyId, session } = await guard("settings.fiscal_year", "update");
    const { id } = await ctx.params;
    const input = fiscalYearUpdate.parse(await req.json());
    const updated = await updateFiscalYear(companyId, session.id, id, input);
    return ok({ fiscalYear: updated });
  },
);
