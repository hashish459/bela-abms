import { ok, handler } from "@/lib/api";
import { guard } from "@/lib/guard";
import { userUpdate } from "@/server/settings/schemas";
import { updateUser } from "@/server/settings/service";

export const PATCH = handler(
  async (req: Request, ctx: RouteContext<"/api/settings/users/[id]">) => {
    const { companyId, session } = await guard("settings.users", "update");
    const { id } = await ctx.params;
    const input = userUpdate.parse(await req.json());
    await updateUser(companyId, session.id, id, input);
    return ok({ updated: true });
  },
);
