import { ok, handler } from "@/lib/api";
import { guard } from "@/lib/guard";
import { expiryManagement } from "@/server/inventory/stock";

export const GET = handler(async (req: Request) => {
  const { companyId } = await guard("reports.inventory_reports", "read");
  const url = new URL(req.url);
  const withinDays = url.searchParams.get("withinDays");
  return ok({ rows: await expiryManagement(companyId, { withinDays: withinDays ? Number(withinDays) : undefined }) });
});
