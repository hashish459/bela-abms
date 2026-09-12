import { ok, handler } from "@/lib/api";
import { guard } from "@/lib/guard";
import { deleteBranch } from "@/server/settings/service";

export const DELETE = handler(
  async (_req: Request, ctx: RouteContext<"/api/settings/branches/[id]">) => {
    const { companyId, session } = await guard("settings.users", "delete");
    const { id } = await ctx.params;
    await deleteBranch(companyId, session.id, id);
    return ok({ deleted: true });
  },
);
