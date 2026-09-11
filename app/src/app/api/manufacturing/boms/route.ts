import { ok, handler } from "@/lib/api";
import { guard } from "@/lib/guard";
import { bomCreate } from "@/server/manufacturing/schemas";
import { createBom, listBoms } from "@/server/manufacturing/service";

export const GET = handler(async () => {
  const { companyId } = await guard("manufacturing.bill_of_materials", "read");
  return ok({ boms: await listBoms(companyId) });
});

export const POST = handler(async (req: Request) => {
  const { companyId, session } = await guard("manufacturing.bill_of_materials", "create");
  const input = bomCreate.parse(await req.json());
  return ok({ bom: await createBom(companyId, session.id, input) }, { status: 201 });
});
