import { ok, handler } from "@/lib/api";
import { guard } from "@/lib/guard";
import { activeFiscalYearId } from "@/lib/fiscal-year";
import { ledgerCreate } from "@/server/accounts/schemas";
import { createLedger, listLedgers } from "@/server/accounts/service";

export const GET = handler(async (req: Request) => {
  const { companyId } = await guard("accounts.charts_of_accounts", "read");
  const url = new URL(req.url);
  const rows = await listLedgers(companyId, {
    search: url.searchParams.get("search") ?? undefined,
    groupCodes: url.searchParams.get("groups")?.split(",").filter(Boolean),
    headCodes: url.searchParams.get("heads")?.split(",").filter(Boolean),
    contactKind: url.searchParams.get("contactKind") ?? undefined,
  });
  return ok({ ledgers: rows });
});

export const POST = handler(async (req: Request) => {
  const { companyId, session } = await guard("accounts.charts_of_accounts", "create");
  const input = ledgerCreate.parse(await req.json());
  const fyId = await activeFiscalYearId(companyId).catch(() => null);
  const created = await createLedger(companyId, fyId, session.id, input);
  return ok({ ledger: created }, { status: 201 });
});
