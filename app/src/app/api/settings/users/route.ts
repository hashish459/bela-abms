import { ok, handler } from "@/lib/api";
import { guard } from "@/lib/guard";
import { userCreate } from "@/server/settings/schemas";
import { createUser, listUsers } from "@/server/settings/service";

export const GET = handler(async () => {
  const { companyId } = await guard("settings.users", "read");
  return ok({ users: await listUsers(companyId) });
});

export const POST = handler(async (req: Request) => {
  const { companyId, session } = await guard("settings.users", "create");
  const input = userCreate.parse(await req.json());
  const created = await createUser(companyId, session.id, input);
  return ok({ user: { id: created.id } }, { status: 201 });
});
