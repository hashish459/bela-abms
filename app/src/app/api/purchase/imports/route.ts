import { ok, handler } from "@/lib/api";
import { guard } from "@/lib/guard";
import { activeFiscalYearId } from "@/lib/fiscal-year";
import { importShipmentCreate } from "@/server/import-shipment/schemas";
import { createImportShipment, listImportShipments } from "@/server/import-shipment/service";

export const GET = handler(async (req: Request) => {
  const { companyId } = await guard("purchase.imports", "read");
  const fyId = await activeFiscalYearId(companyId).catch(() => null);
  return ok(
    await listImportShipments(companyId, fyId, {
      page: Number(new URL(req.url).searchParams.get("page") ?? 1),
    }),
  );
});

export const POST = handler(async (req: Request) => {
  const { companyId, session } = await guard("purchase.imports", "create");
  const input = importShipmentCreate.parse(await req.json());
  const fyId = await activeFiscalYearId(companyId);
  const doc = await createImportShipment(companyId, fyId, session.id, input);
  return ok({ doc }, { status: 201 });
});
