import { ok, handler } from "@/lib/api";
import { guard } from "@/lib/guard";
import { activeFiscalYearId } from "@/lib/fiscal-year";
import { productionOrderCreate } from "@/server/manufacturing/schemas";
import { createProductionOrder, listProductionOrders } from "@/server/manufacturing/service";

export const GET = handler(async () => {
  const { companyId } = await guard("manufacturing.production_order", "read");
  const fyId = await activeFiscalYearId(companyId).catch(() => null);
  return ok({ orders: await listProductionOrders(companyId, fyId) });
});

export const POST = handler(async (req: Request) => {
  const { companyId, session } = await guard("manufacturing.production_order", "create");
  const input = productionOrderCreate.parse(await req.json());
  const fyId = await activeFiscalYearId(companyId);
  return ok({ order: await createProductionOrder(companyId, fyId, session.id, input) }, { status: 201 });
});
