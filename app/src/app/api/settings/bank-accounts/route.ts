import { ok, handler } from "@/lib/api";
import { guard } from "@/lib/guard";
import { bankAccountCreate } from "@/server/settings/schemas";
import { createBankAccount, listBankAccounts } from "@/server/settings/service";

export const GET = handler(async () => {
  const { companyId } = await guard("settings.bank_detail", "read");
  return ok({ accounts: await listBankAccounts(companyId) });
});

export const POST = handler(async (req: Request) => {
  const { companyId, session } = await guard("settings.bank_detail", "create");
  const input = bankAccountCreate.parse(await req.json());
  const created = await createBankAccount(companyId, session.id, input);
  return ok({ account: created }, { status: 201 });
});
