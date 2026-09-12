import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { listInvoiceImportTemplates } from "@/server/settings/service";
import { InvoiceImportSettingManager } from "./invoice-import-setting-manager";

export const metadata = { title: "Invoice Import Setting — Bela ABMS" };

export default async function InvoiceImportSettingPage() {
  const s = (await getSession())!;
  if (!can(s.permissions, "settings.invoice_import_setting", "read")) redirect("/dashboard");

  const templates = await listInvoiceImportTemplates(s.companyId!);
  return (
    <InvoiceImportSettingManager
      initial={templates.map((t) => ({
        id: t.id, name: t.name, columnMap: t.columnMap as Record<string, string>, isDefault: t.isDefault,
      }))}
      canCreate={can(s.permissions, "settings.invoice_import_setting", "create")}
      canUpdate={can(s.permissions, "settings.invoice_import_setting", "update")}
      canDelete={can(s.permissions, "settings.invoice_import_setting", "delete")}
    />
  );
}
