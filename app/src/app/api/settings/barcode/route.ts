import { ok, handler } from "@/lib/api";
import { guard } from "@/lib/guard";
import { barcodeSettingUpdate } from "@/server/settings/schemas";
import { getBarcodeSetting, upsertBarcodeSetting } from "@/server/settings/service";

export const GET = handler(async () => {
  const { companyId } = await guard("settings.barcode", "read");
  return ok({ setting: await getBarcodeSetting(companyId) });
});

export const PUT = handler(async (req: Request) => {
  const { companyId, session } = await guard("settings.barcode", "update");
  const input = barcodeSettingUpdate.parse(await req.json());
  const saved = await upsertBarcodeSetting(companyId, session.id, input);
  return ok({ setting: saved });
});
