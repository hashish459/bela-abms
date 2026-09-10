import { ok, handler } from "@/lib/api";
import { guard } from "@/lib/guard";
import { activeFiscalYearId } from "@/lib/fiscal-year";
import { invoiceCreate } from "@/server/sales/schemas";
import { createInvoice, listSalesDocs } from "@/server/sales/service";

export const GET = handler(async (req: Request) => {
  const { companyId } = await guard("sales.sales_invoice", "read");
  const url = new URL(req.url);
  const fyId = await activeFiscalYearId(companyId).catch(() => null);
  return ok(
    await listSalesDocs(companyId, fyId, "INVOICE", {
      page: Number(url.searchParams.get("page") ?? 1),
      search: url.searchParams.get("search") ?? undefined,
    }),
  );
});

export const POST = handler(async (req: Request) => {
  const { companyId, session } = await guard("sales.sales_invoice", "create");
  const input = invoiceCreate.parse(await req.json());
  const fyId = await activeFiscalYearId(companyId);
  const res = await createInvoice(companyId, fyId, session.id, input);
  return ok({ invoice: res }, { status: 201 });
});
