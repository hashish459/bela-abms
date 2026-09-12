import { ok, handler } from "@/lib/api";
import { guard } from "@/lib/guard";
import { activeFiscalYearId } from "@/lib/fiscal-year";
import { chalaniCreate } from "@/server/chalani/schemas";
import { createChalani, listChalanis } from "@/server/chalani/service";

export const GET = handler(async (req: Request) => {
  const { companyId } = await guard("sales.chalani", "read");
  const fyId = await activeFiscalYearId(companyId).catch(() => null);
  return ok(
    await listChalanis(companyId, fyId, {
      page: Number(new URL(req.url).searchParams.get("page") ?? 1),
    }),
  );
});

export const POST = handler(async (req: Request) => {
  const { companyId, session } = await guard("sales.chalani", "create");
  const input = chalaniCreate.parse(await req.json());
  const fyId = await activeFiscalYearId(companyId);
  const doc = await createChalani(companyId, fyId, session.id, input);
  return ok({ doc }, { status: 201 });
});
