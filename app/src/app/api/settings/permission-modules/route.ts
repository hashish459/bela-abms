import { ok, handler } from "@/lib/api";
import { guard } from "@/lib/guard";
import { getPermissionModules } from "@/server/settings/service";

export const GET = handler(async () => {
  await guard("settings.roles_and_permissions", "read");
  return ok({ groups: await getPermissionModules() });
});
