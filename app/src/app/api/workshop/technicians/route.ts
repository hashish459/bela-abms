import { ok, handler } from "@/lib/api";
import { guard } from "@/lib/guard";
import { technicianCreate } from "@/server/workshop/schemas";
import { createTechnician, listTechnicians } from "@/server/workshop/service";

export const GET = handler(async (req: Request) => {
  const { companyId } = await guard("workshop.technician", "read");
  const activeOnly = new URL(req.url).searchParams.get("activeOnly") === "true";
  return ok({ technicians: await listTechnicians(companyId, { activeOnly }) });
});

export const POST = handler(async (req: Request) => {
  const { companyId, session } = await guard("workshop.technician", "create");
  const input = technicianCreate.parse(await req.json());
  return ok({ technician: await createTechnician(companyId, session.id, input) }, { status: 201 });
});
