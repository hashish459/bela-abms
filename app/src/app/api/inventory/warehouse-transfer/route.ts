import { ok, handler } from "@/lib/api";
import { guard } from "@/lib/guard";
import { activeFiscalYearId } from "@/lib/fiscal-year";
import { warehouseTransferCreate } from "@/server/warehouse-transfer/schemas";
import { createWarehouseTransfer, listWarehouseTransfers } from "@/server/warehouse-transfer/service";

export const GET = handler(async (req: Request) => {
  const { companyId } = await guard("inventory.warehouse_transfer", "read");
  const fyId = await activeFiscalYearId(companyId).catch(() => null);
  return ok(
    await listWarehouseTransfers(companyId, fyId, {
      page: Number(new URL(req.url).searchParams.get("page") ?? 1),
    }),
  );
});

export const POST = handler(async (req: Request) => {
  const { companyId, session } = await guard("inventory.warehouse_transfer", "create");
  const input = warehouseTransferCreate.parse(await req.json());
  const fyId = await activeFiscalYearId(companyId);
  const doc = await createWarehouseTransfer(companyId, fyId, session.id, input);
  return ok({ doc }, { status: 201 });
});
