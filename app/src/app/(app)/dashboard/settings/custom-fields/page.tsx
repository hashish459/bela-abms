import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { listCustomFields } from "@/server/settings/service";
import { CustomFieldsManager } from "./custom-fields-manager";

export const metadata = { title: "Custom Fields — Bela ABMS" };

export default async function CustomFieldsPage() {
  const s = (await getSession())!;
  if (!can(s.permissions, "settings.custom_fields", "read")) redirect("/dashboard");

  const fields = await listCustomFields(s.companyId!);
  return (
    <CustomFieldsManager
      initial={fields.map((f) => ({
        id: f.id, module: f.module, label: f.label, fieldType: f.fieldType,
        options: (f.options as string[] | null) ?? [], required: f.required, isActive: f.isActive,
      }))}
      canCreate={can(s.permissions, "settings.custom_fields", "create")}
      canUpdate={can(s.permissions, "settings.custom_fields", "update")}
      canDelete={can(s.permissions, "settings.custom_fields", "delete")}
    />
  );
}
