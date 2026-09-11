import { ok, handler } from "@/lib/api";
import { guard } from "@/lib/guard";
import { companyInfoUpdate } from "@/server/settings/schemas";
import { getCompanyInfo, upsertCompanyInfo } from "@/server/settings/service";

export const GET = handler(async () => {
  const { companyId } = await guard("settings.company_info", "read");
  return ok({ companyInfo: await getCompanyInfo(companyId) });
});

export const PUT = handler(async (req: Request) => {
  const { companyId, session } = await guard("settings.company_info", "update");
  const input = companyInfoUpdate.parse(await req.json());
  return ok({ companyInfo: await upsertCompanyInfo(companyId, session.id, input) });
});
