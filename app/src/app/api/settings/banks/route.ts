import { ok, handler } from "@/lib/api";
import { guard } from "@/lib/guard";
import { bankCreate } from "@/server/settings/schemas";
import { createBank, listBanks } from "@/server/settings/service";

export const GET = handler(async () => {
  const { companyId } = await guard("settings.banks", "read");
  return ok({ banks: await listBanks(companyId) });
});

export const POST = handler(async (req: Request) => {
  const { companyId, session } = await guard("settings.banks", "create");
  const input = bankCreate.parse(await req.json());
  const created = await createBank(companyId, session.id, input);
  return ok({ bank: created }, { status: 201 });
});
