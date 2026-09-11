import { ok, handler } from "@/lib/api";
import { guard } from "@/lib/guard";
import { getJobCard } from "@/server/workshop/service";

export const GET = handler(async (_req: Request, ctx: RouteContext<"/api/workshop/job-cards/[id]">) => {
  const { companyId } = await guard("workshop.job_card", "read");
  const { id } = await ctx.params;
  return ok({ jobCard: await getJobCard(companyId, id) });
});
