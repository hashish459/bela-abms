import { ok, handler } from "@/lib/api";
import { guard } from "@/lib/guard";
import { invoiceSettingUpdate } from "@/server/settings/schemas";
import { getInvoiceSetting, upsertInvoiceSetting } from "@/server/settings/service";

export const GET = handler(async () => {
  const { companyId } = await guard("settings.invoice_setting", "read");
  return ok({ setting: await getInvoiceSetting(companyId) });
});

export const PUT = handler(async (req: Request) => {
  const { companyId, session } = await guard("settings.invoice_setting", "update");
  const input = invoiceSettingUpdate.parse(await req.json());
  const saved = await upsertInvoiceSetting(companyId, session.id, input);
  return ok({ setting: saved });
});
