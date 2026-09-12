import { ok, handler } from "@/lib/api";
import { guard } from "@/lib/guard";
import { listPayables } from "@/server/purchase/service";

export const GET = handler(async (req: Request) => {
  const { companyId } = await guard("purchase.payable_amount", "read");
  const search = new URL(req.url).searchParams.get("search") ?? undefined;
  return ok(await listPayables(companyId, { search }));
});
