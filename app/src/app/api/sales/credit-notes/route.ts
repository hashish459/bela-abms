import { ok, handler } from "@/lib/api";
import { guard } from "@/lib/guard";
import { activeFiscalYearId } from "@/lib/fiscal-year";
import { creditNoteCreate } from "@/server/sales/schemas";
import { createCreditNote, listSalesDocs } from "@/server/sales/service";

export const GET = handler(async (req: Request) => {
  const { companyId } = await guard("sales.credit_note", "read");
  const fyId = await activeFiscalYearId(companyId).catch(() => null);
  return ok(
    await listSalesDocs(companyId, fyId, "CREDIT_NOTE", {
      page: Number(new URL(req.url).searchParams.get("page") ?? 1),
    }),
  );
});

export const POST = handler(async (req: Request) => {
  const { companyId, session } = await guard("sales.credit_note", "create");
  const input = creditNoteCreate.parse(await req.json());
  const fyId = await activeFiscalYearId(companyId);
  return ok({ creditNote: await createCreditNote(companyId, fyId, session.id, input) }, { status: 201 });
});
