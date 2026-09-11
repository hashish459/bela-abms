import { ok, handler } from "@/lib/api";
import { guard } from "@/lib/guard";
import { activeFiscalYearId } from "@/lib/fiscal-year";
import { purchaseInvoiceCreate } from "@/server/purchase/schemas";
import { createPurchaseInvoice, listPurchaseDocs } from "@/server/purchase/service";

export const GET = handler(async (req: Request) => {
  const { companyId } = await guard("purchase.purchase_invoice", "read");
  const url = new URL(req.url);
  const fyId = await activeFiscalYearId(companyId).catch(() => null);
  return ok(
    await listPurchaseDocs(companyId, fyId, "INVOICE", {
      page: Number(url.searchParams.get("page") ?? 1),
      search: url.searchParams.get("search") ?? undefined,
    }),
  );
});

export const POST = handler(async (req: Request) => {
  const { companyId, session } = await guard("purchase.purchase_invoice", "create");
  const input = purchaseInvoiceCreate.parse(await req.json());
  const fyId = await activeFiscalYearId(companyId);
  const res = await createPurchaseInvoice(companyId, fyId, session.id, input);
  return ok({ invoice: res }, { status: 201 });
});
