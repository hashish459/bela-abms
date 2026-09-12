import { ok, handler } from "@/lib/api";
import { guard } from "@/lib/guard";
import { customFieldUpdate } from "@/server/settings/schemas";
import { deleteCustomField, updateCustomField } from "@/server/settings/service";

export const PATCH = handler(
  async (req: Request, ctx: RouteContext<"/api/settings/custom-fields/[id]">) => {
    const { companyId, session } = await guard("settings.custom_fields", "update");
    const { id } = await ctx.params;
    const input = customFieldUpdate.parse(await req.json());
    await updateCustomField(companyId, session.id, id, input);
    return ok({ updated: true });
  },
);

export const DELETE = handler(
  async (_req: Request, ctx: RouteContext<"/api/settings/custom-fields/[id]">) => {
    const { companyId, session } = await guard("settings.custom_fields", "delete");
    const { id } = await ctx.params;
    await deleteCustomField(companyId, session.id, id);
    return ok({ deleted: true });
  },
);
