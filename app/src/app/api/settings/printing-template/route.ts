import { ok, handler } from "@/lib/api";
import { guard } from "@/lib/guard";
import { printingTemplateUpdate } from "@/server/settings/schemas";
import { getInvoiceSetting, updatePrintingTemplate } from "@/server/settings/service";

export const GET = handler(async () => {
  const { companyId } = await guard("settings.printing_templates", "read");
  const setting = await getInvoiceSetting(companyId);
  return ok({ template: setting.template });
});

export const PUT = handler(async (req: Request) => {
  const { companyId, session } = await guard("settings.printing_templates", "update");
  const input = printingTemplateUpdate.parse(await req.json());
  const saved = await updatePrintingTemplate(companyId, session.id, input);
  return ok({ template: saved.template });
});
