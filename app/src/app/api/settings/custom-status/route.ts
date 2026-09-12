import { ok, handler } from "@/lib/api";
import { guard } from "@/lib/guard";
import { customStatusCreate } from "@/server/settings/schemas";
import { createCustomStatus, listCustomStatuses } from "@/server/settings/service";

export const GET = handler(async () => {
  const { companyId } = await guard("settings.custom_status", "read");
  return ok({ statuses: await listCustomStatuses(companyId) });
});

export const POST = handler(async (req: Request) => {
  const { companyId, session } = await guard("settings.custom_status", "create");
  const input = customStatusCreate.parse(await req.json());
  const created = await createCustomStatus(companyId, session.id, input);
  return ok({ status: created }, { status: 201 });
});
