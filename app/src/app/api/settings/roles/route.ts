import { ok, handler } from "@/lib/api";
import { guard } from "@/lib/guard";
import { roleCreate } from "@/server/settings/schemas";
import { createRole, listRoles } from "@/server/settings/service";

export const GET = handler(async () => {
  const { companyId } = await guard("settings.roles_and_permissions", "read");
  return ok({ roles: await listRoles(companyId) });
});

export const POST = handler(async (req: Request) => {
  const { companyId, session } = await guard("settings.roles_and_permissions", "create");
  const input = roleCreate.parse(await req.json());
  const created = await createRole(companyId, session.id, input);
  return ok({ role: { id: created.id } }, { status: 201 });
});
