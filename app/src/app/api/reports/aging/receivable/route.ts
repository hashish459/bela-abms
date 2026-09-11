import { ok, handler } from "@/lib/api";
import { guard } from "@/lib/guard";
import { receivablesAging } from "@/server/reports/service";

export const GET = handler(async (req: Request) => {
  const { companyId } = await guard("reports.receivable_reports", "read");
  const url = new URL(req.url);
  const asOf = url.searchParams.get("asOf");
  const data = await receivablesAging(companyId, { asOf: asOf ? new Date(asOf) : undefined });
  return ok(data);
});
