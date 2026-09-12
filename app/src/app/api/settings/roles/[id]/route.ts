import { ok, handler } from "@/lib/api";
import { guard } from "@/lib/guard";
import { roleUpdate } from "@/server/settings/schemas";
import { deleteRole, updateRole } from "@/server/settings/service";

export const PATCH = handler(
  async (req: Request, ctx: RouteContext<"/api/settings/roles/[id]">) => {
    const { companyId, session } = await guard("settings.roles_and_permissions", "update");
    const { id } = await ctx.params;
    const input = roleUpdate.parse(await req.json());
    await updateRole(companyId, session.id, id, input);
    return ok({ updated: true });
  },
);

export const DELETE = handler(
  async (_req: Request, ctx: RouteContext<"/api/settings/roles/[id]">) => {
    const { companyId, session } = await guard("settings.roles_and_permissions", "delete");
    const { id } = await ctx.params;
    await deleteRole(companyId, session.id, id);
    return ok({ deleted: true });
  },
);
