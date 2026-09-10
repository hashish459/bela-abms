import { ok, handler } from "@/lib/api";
import { guard } from "@/lib/guard";
import { chartOfAccounts } from "@/server/accounts/service";

export const GET = handler(async () => {
  const { companyId } = await guard("accounts.charts_of_accounts", "read");
  return ok({ heads: await chartOfAccounts(companyId) });
});
