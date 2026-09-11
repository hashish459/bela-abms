import { ok, handler } from "@/lib/api";
import { guard } from "@/lib/guard";
import { activeFiscalYearId } from "@/lib/fiscal-year";
import { jobCardBill } from "@/server/workshop/schemas";
import { billJobCard } from "@/server/workshop/service";

export const POST = handler(async (req: Request, ctx: RouteContext<"/api/workshop/job-cards/[id]/bill">) => {
  const { companyId, session } = await guard("workshop.job_card", "update");
  const { id } = await ctx.params;
  const input = jobCardBill.parse(await req.json());
  const fyId = await activeFiscalYearId(companyId);
  return ok(await billJobCard(companyId, fyId, session.id, id, input));
});
