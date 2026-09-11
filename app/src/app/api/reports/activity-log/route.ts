import { ok, handler } from "@/lib/api";
import { guard } from "@/lib/guard";
import { activityLog } from "@/server/reports/service";

export const GET = handler(async (req: Request) => {
  const { companyId } = await guard("reports.system_reports", "read");
  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const page = Number(url.searchParams.get("page") ?? "1");
  const data = await activityLog(companyId, {
    from: from ? new Date(from) : undefined,
    to: to ? new Date(to) : undefined,
    userId: url.searchParams.get("userId") ?? undefined,
    action: url.searchParams.get("action") ?? undefined,
    page,
  });
  return ok(data);
});
