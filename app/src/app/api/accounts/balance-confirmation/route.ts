import { ok, handler } from "@/lib/api";
import { guard } from "@/lib/guard";
import { activeFiscalYearId } from "@/lib/fiscal-year";
import { balanceConfirmationCreate } from "@/server/balance-confirmation/schemas";
import { createBalanceConfirmation, listBalanceConfirmations } from "@/server/balance-confirmation/service";

export const GET = handler(async (req: Request) => {
  const { companyId } = await guard("accounts.balance_confirmation", "read");
  return ok(
    await listBalanceConfirmations(companyId, {
      page: Number(new URL(req.url).searchParams.get("page") ?? 1),
    }),
  );
});

export const POST = handler(async (req: Request) => {
  const { companyId, session } = await guard("accounts.balance_confirmation", "create");
  const input = balanceConfirmationCreate.parse(await req.json());
  const fyId = await activeFiscalYearId(companyId);
  const doc = await createBalanceConfirmation(companyId, fyId, session.id, input);
  return ok({ doc }, { status: 201 });
});
