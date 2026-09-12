import { ok, handler } from "@/lib/api";
import { guard } from "@/lib/guard";
import { invoiceImportTemplateCreate } from "@/server/settings/schemas";
import { createInvoiceImportTemplate, listInvoiceImportTemplates } from "@/server/settings/service";

export const GET = handler(async () => {
  const { companyId } = await guard("settings.invoice_import_setting", "read");
  return ok({ templates: await listInvoiceImportTemplates(companyId) });
});

export const POST = handler(async (req: Request) => {
  const { companyId, session } = await guard("settings.invoice_import_setting", "create");
  const input = invoiceImportTemplateCreate.parse(await req.json());
  const created = await createInvoiceImportTemplate(companyId, session.id, input);
  return ok({ template: created }, { status: 201 });
});
