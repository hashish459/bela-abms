import { ok, handler } from "@/lib/api";
import { guard } from "@/lib/guard";
import { customStatusUpdate } from "@/server/settings/schemas";
import { deleteCustomStatus, updateCustomStatus } from "@/server/settings/service";

export const PATCH = handler(
  async (req: Request, ctx: RouteContext<"/api/settings/custom-status/[id]">) => {
    const { companyId, session } = await guard("settings.custom_status", "update");
    const { id } = await ctx.params;
    const input = customStatusUpdate.parse(await req.json());
    await updateCustomStatus(companyId, session.id, id, input);
    return ok({ updated: true });
  },
);

export const DELETE = handler(
  async (_req: Request, ctx: RouteContext<"/api/settings/custom-status/[id]">) => {
    const { companyId, session } = await guard("settings.custom_status", "delete");
    const { id } = await ctx.params;
    await deleteCustomStatus(companyId, session.id, id);
    return ok({ deleted: true });
  },
);
