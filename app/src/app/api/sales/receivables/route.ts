import { ok, handler } from "@/lib/api";
import { guard } from "@/lib/guard";
import { listReceivables } from "@/server/sales/service";

export const GET = handler(async (req: Request) => {
  const { companyId } = await guard("sales.receivable_amount", "read");
  const search = new URL(req.url).searchParams.get("search") ?? undefined;
  return ok(await listReceivables(companyId, { search }));
});
