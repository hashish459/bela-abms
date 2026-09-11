import { ok, handler } from "@/lib/api";
import { guard } from "@/lib/guard";
import { activeFiscalYearId } from "@/lib/fiscal-year";
import { purchaseOrderCreate } from "@/server/purchase/schemas";
import { createPurchaseOrder, listPurchaseDocs } from "@/server/purchase/service";

export const GET = handler(async (req: Request) => {
  const { companyId } = await guard("purchase.purchase_order", "read");
  const fyId = await activeFiscalYearId(companyId).catch(() => null);
  return ok(
    await listPurchaseDocs(companyId, fyId, "PURCHASE_ORDER", {
      page: Number(new URL(req.url).searchParams.get("page") ?? 1),
    }),
  );
});

export const POST = handler(async (req: Request) => {
  const { companyId, session } = await guard("purchase.purchase_order", "create");
  const input = purchaseOrderCreate.parse(await req.json());
  const fyId = await activeFiscalYearId(companyId);
  const doc = await createPurchaseOrder(companyId, fyId, session.id, input);
  return ok({ doc: { id: doc.id, number: doc.number } }, { status: 201 });
});
