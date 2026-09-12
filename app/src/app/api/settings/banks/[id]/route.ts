import { ok, handler } from "@/lib/api";
import { guard } from "@/lib/guard";
import { bankUpdate } from "@/server/settings/schemas";
import { deleteBank, updateBank } from "@/server/settings/service";

export const PATCH = handler(
  async (req: Request, ctx: RouteContext<"/api/settings/banks/[id]">) => {
    const { companyId, session } = await guard("settings.banks", "update");
    const { id } = await ctx.params;
    const input = bankUpdate.parse(await req.json());
    const updated = await updateBank(companyId, session.id, id, input);
    return ok({ bank: updated });
  },
);

export const DELETE = handler(
  async (_req: Request, ctx: RouteContext<"/api/settings/banks/[id]">) => {
    const { companyId, session } = await guard("settings.banks", "delete");
    const { id } = await ctx.params;
    await deleteBank(companyId, session.id, id);
    return ok({ deleted: true });
  },
);
