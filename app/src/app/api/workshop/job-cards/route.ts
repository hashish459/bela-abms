import { ok, handler } from "@/lib/api";
import { guard } from "@/lib/guard";
import { activeFiscalYearId } from "@/lib/fiscal-year";
import { jobCardCreate } from "@/server/workshop/schemas";
import { createJobCard, listJobCards } from "@/server/workshop/service";

export const GET = handler(async (req: Request) => {
  const { companyId } = await guard("workshop.job_card", "read");
  const fyId = await activeFiscalYearId(companyId).catch(() => null);
  const status = new URL(req.url).searchParams.get("status") ?? undefined;
  return ok({ jobCards: await listJobCards(companyId, fyId, { status }) });
});

export const POST = handler(async (req: Request) => {
  const { companyId, session } = await guard("workshop.job_card", "create");
  const input = jobCardCreate.parse(await req.json());
  const fyId = await activeFiscalYearId(companyId);
  return ok({ jobCard: await createJobCard(companyId, fyId, session.id, input) }, { status: 201 });
});
