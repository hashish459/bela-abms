import { ok, handler } from "@/lib/api";
import { guard } from "@/lib/guard";
import { receiptTemplateUpdate } from "@/server/settings/schemas";
import { getInvoiceSetting, updateReceiptTemplate } from "@/server/settings/service";

export const GET = handler(async () => {
  const { companyId } = await guard("settings.printing_templates", "read");
  const setting = await getInvoiceSetting(companyId);
  return ok({ receiptTemplate: setting.receiptTemplate });
});

export const PUT = handler(async (req: Request) => {
  const { companyId, session } = await guard("settings.printing_templates", "update");
  const input = receiptTemplateUpdate.parse(await req.json());
  const saved = await updateReceiptTemplate(companyId, session.id, input);
  return ok({ receiptTemplate: saved.receiptTemplate });
});
