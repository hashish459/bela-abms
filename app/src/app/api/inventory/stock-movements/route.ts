import { ok, handler } from "@/lib/api";
import { guard } from "@/lib/guard";
import { stockMovementLedger } from "@/server/inventory/stock";
import type { StockMovementKind } from "@prisma/client";

export const GET = handler(async (req: Request) => {
  const { companyId } = await guard("inventory.inventory_transfer", "read");
  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  return ok(
    await stockMovementLedger(companyId, {
      productId: url.searchParams.get("productId") || undefined,
      warehouseId: url.searchParams.get("warehouseId") || undefined,
      kind: (url.searchParams.get("kind") as StockMovementKind) || undefined,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      page: Number(url.searchParams.get("page") ?? 1),
    }),
  );
});
