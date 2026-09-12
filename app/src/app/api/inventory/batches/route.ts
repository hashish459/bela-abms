import { ok, errors, handler } from "@/lib/api";
import { guard } from "@/lib/guard";
import { db } from "@/lib/db";
import { availableBatches } from "@/server/inventory/stock";

export const GET = handler(async (req: Request) => {
  const { companyId } = await guard("inventory.product_item", "read");
  const url = new URL(req.url);
  const productId = url.searchParams.get("productId");
  if (!productId) throw errors.badRequest("productId is required");

  let warehouseId = url.searchParams.get("warehouseId");
  if (!warehouseId) {
    const defaultWh = await db.warehouse.findFirst({
      where: { companyId, deletedAt: null },
      orderBy: { isDefault: "desc" },
      select: { id: true },
    });
    warehouseId = defaultWh?.id ?? null;
  }
  if (!warehouseId) return ok({ batches: [] });

  return ok({ batches: await availableBatches(companyId, productId, warehouseId) });
});
