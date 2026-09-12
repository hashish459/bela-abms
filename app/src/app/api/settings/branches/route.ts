import { ok, handler } from "@/lib/api";
import { guard } from "@/lib/guard";
import { branchCreate } from "@/server/settings/schemas";
import { createBranch, listBranches } from "@/server/settings/service";

export const GET = handler(async () => {
  const { companyId } = await guard("settings.users", "read");
  return ok({ branches: await listBranches(companyId) });
});

export const POST = handler(async (req: Request) => {
  const { companyId, session } = await guard("settings.users", "create");
  const input = branchCreate.parse(await req.json());
  const created = await createBranch(companyId, session.id, input);
  return ok({ branch: created }, { status: 201 });
});
