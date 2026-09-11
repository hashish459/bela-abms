import { ok, handler } from "@/lib/api";
import { guard } from "@/lib/guard";
import { cancelJobCard } from "@/server/workshop/service";

export const POST = handler(async (_req: Request, ctx: RouteContext<"/api/workshop/job-cards/[id]/cancel">) => {
  const { companyId, session } = await guard("workshop.job_card", "update");
  const { id } = await ctx.params;
  return ok(await cancelJobCard(companyId, session.id, id));
});
