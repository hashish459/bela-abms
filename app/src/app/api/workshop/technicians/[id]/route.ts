import { ok, handler } from "@/lib/api";
import { guard } from "@/lib/guard";
import { technicianUpdate } from "@/server/workshop/schemas";
import { updateTechnician } from "@/server/workshop/service";

export const PATCH = handler(async (req: Request, ctx: RouteContext<"/api/workshop/technicians/[id]">) => {
  const { companyId, session } = await guard("workshop.technician", "update");
  const { id } = await ctx.params;
  const input = technicianUpdate.parse(await req.json());
  return ok({ technician: await updateTechnician(companyId, session.id, id, input) });
});
