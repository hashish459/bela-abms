import { ok, handler } from "@/lib/api";
import { guard } from "@/lib/guard";
import { invoiceImportTemplateUpdate } from "@/server/settings/schemas";
import { deleteInvoiceImportTemplate, updateInvoiceImportTemplate } from "@/server/settings/service";

export const PATCH = handler(
  async (req: Request, ctx: RouteContext<"/api/settings/invoice-import-templates/[id]">) => {
    const { companyId, session } = await guard("settings.invoice_import_setting", "update");
    const { id } = await ctx.params;
    const input = invoiceImportTemplateUpdate.parse(await req.json());
    await updateInvoiceImportTemplate(companyId, session.id, id, input);
    return ok({ updated: true });
  },
);

export const DELETE = handler(
  async (_req: Request, ctx: RouteContext<"/api/settings/invoice-import-templates/[id]">) => {
    const { companyId, session } = await guard("settings.invoice_import_setting", "delete");
    const { id } = await ctx.params;
    await deleteInvoiceImportTemplate(companyId, session.id, id);
    return ok({ deleted: true });
  },
);
