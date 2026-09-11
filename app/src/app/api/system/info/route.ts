import { ok, handler } from "@/lib/api";
import { guard } from "@/lib/guard";
import { getSystemInfo } from "@/server/system/service";

export const GET = handler(async () => {
  const { companyId } = await guard("system.system_info", "read");
  return ok(await getSystemInfo(companyId));
});
