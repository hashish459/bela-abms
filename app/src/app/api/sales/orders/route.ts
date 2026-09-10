import { ok, handler } from "@/lib/api";
import { guard } from "@/lib/guard";
import { activeFiscalYearId } from "@/lib/fiscal-year";
import { draftCreate } from "@/server/sales/schemas";
import { createDraft, listSalesDocs } from "@/server/sales/service";

export const GET = handler(async (req: Request) => {
  const { companyId } = await guard("sales.sales_order", "read");
  const fyId = await activeFiscalYearId(companyId).catch(() => null);
  return ok(
    await listSalesDocs(companyId, fyId, "SALES_ORDER", {
      page: Number(new URL(req.url).searchParams.get("page") ?? 1),
    }),
  );
});

export const POST = handler(async (req: Request) => {
  const { companyId, session } = await guard("sales.sales_order", "create");
  const input = draftCreate.parse({ ...(await req.json()), type: "SALES_ORDER" });
  const fyId = await activeFiscalYearId(companyId);
  const doc = await createDraft(companyId, fyId, session.id, input);
  return ok({ doc: { id: doc.id, number: doc.number } }, { status: 201 });
});
