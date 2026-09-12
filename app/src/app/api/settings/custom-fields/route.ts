import { ok, handler } from "@/lib/api";
import { guard } from "@/lib/guard";
import { customFieldCreate } from "@/server/settings/schemas";
import { createCustomField, listCustomFields } from "@/server/settings/service";

export const GET = handler(async () => {
  const { companyId } = await guard("settings.custom_fields", "read");
  return ok({ fields: await listCustomFields(companyId) });
});

export const POST = handler(async (req: Request) => {
  const { companyId, session } = await guard("settings.custom_fields", "create");
  const input = customFieldCreate.parse(await req.json());
  const created = await createCustomField(companyId, session.id, input);
  return ok({ field: created }, { status: 201 });
});
