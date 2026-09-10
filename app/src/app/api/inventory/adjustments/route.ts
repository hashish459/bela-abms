import { ok, handler } from "@/lib/api";
import { guard } from "@/lib/guard";
import { activeFiscalYearId } from "@/lib/fiscal-year";
import { adjustmentCreate } from "@/server/inventory/schemas";
import { createAdjustment, listAdjustments } from "@/server/inventory/service";

export const GET = handler(async (req: Request) => {
  const { companyId } = await guard("inventory.inventory_adjustment", "read");
  const page = Number(new URL(req.url).searchParams.get("page") ?? 1);
  return ok(await listAdjustments(companyId, page));
});

export const POST = handler(async (req: Request) => {
  const { companyId, session } = await guard("inventory.inventory_adjustment", "create");
  const input = adjustmentCreate.parse(await req.json());
  const fyId = await activeFiscalYearId(companyId).catch(() => null);
  const adj = await createAdjustment(companyId, fyId, session.id, input);
  return ok({ adjustment: { id: adj.id, number: adj.number } }, { status: 201 });
});
