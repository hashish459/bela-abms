import { ok, handler } from "@/lib/api";
import { guard } from "@/lib/guard";
import { activeFiscalYearId } from "@/lib/fiscal-year";
import { stockJournalCreate } from "@/server/accounts/schemas";
import { createStockJournal, listVouchers } from "@/server/accounts/service";

export const GET = handler(async (req: Request) => {
  const { companyId } = await guard("vouchers.stock_journal", "read");
  const fyId = await activeFiscalYearId(companyId).catch(() => null);
  return ok(
    await listVouchers(companyId, fyId, "STOCK", {
      page: Number(new URL(req.url).searchParams.get("page") ?? 1),
    }),
  );
});

export const POST = handler(async (req: Request) => {
  const { session, companyId } = await guard("vouchers.stock_journal", "create");
  const input = stockJournalCreate.parse(await req.json());
  const fyId = await activeFiscalYearId(companyId);
  const voucher = await createStockJournal(companyId, fyId, session.id, input);
  return ok({ voucher: { id: voucher.id, number: voucher.number } }, { status: 201 });
});
