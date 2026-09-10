import { ok, handler } from "@/lib/api";
import { guard } from "@/lib/guard";
import { unitCreate } from "@/server/inventory/schemas";
import { createUnit, listUnits } from "@/server/inventory/service";

export const GET = handler(async () => {
  const { companyId } = await guard("inventory.units_of_measurement", "read");
  return ok({ units: await listUnits(companyId) });
});

export const POST = handler(async (req: Request) => {
  const { companyId, session } = await guard("inventory.units_of_measurement", "create");
  const input = unitCreate.parse(await req.json());
  return ok({ unit: await createUnit(companyId, session.id, input) }, { status: 201 });
});
