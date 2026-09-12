import { ok, handler } from "@/lib/api";
import { guard } from "@/lib/guard";
import { batchWiseStockSummary } from "@/server/inventory/stock";

export const GET = handler(async (req: Request) => {
  const { companyId } = await guard("reports.inventory_reports", "read");
  const url = new URL(req.url);
  return ok({ rows: await batchWiseStockSummary(companyId, { search: url.searchParams.get("search") ?? undefined }) });
});
