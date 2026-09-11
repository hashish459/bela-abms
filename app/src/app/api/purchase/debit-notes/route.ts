import { ok, handler } from "@/lib/api";
import { guard } from "@/lib/guard";
import { activeFiscalYearId } from "@/lib/fiscal-year";
import { debitNoteCreate } from "@/server/purchase/schemas";
import { createDebitNote, listPurchaseDocs } from "@/server/purchase/service";

export const GET = handler(async (req: Request) => {
  const { companyId } = await guard("purchase.debit_notes", "read");
  const fyId = await activeFiscalYearId(companyId).catch(() => null);
  return ok(
    await listPurchaseDocs(companyId, fyId, "DEBIT_NOTE", {
      page: Number(new URL(req.url).searchParams.get("page") ?? 1),
    }),
  );
});

export const POST = handler(async (req: Request) => {
  const { companyId, session } = await guard("purchase.debit_notes", "create");
  const input = debitNoteCreate.parse(await req.json());
  const fyId = await activeFiscalYearId(companyId);
  return ok({ debitNote: await createDebitNote(companyId, fyId, session.id, input) }, { status: 201 });
});
