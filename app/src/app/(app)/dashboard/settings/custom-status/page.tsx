import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { listCustomStatuses } from "@/server/settings/service";
import { CustomStatusManager } from "./custom-status-manager";

export const metadata = { title: "Custom Status — Bela ABMS" };

export default async function CustomStatusPage() {
  const s = (await getSession())!;
  if (!can(s.permissions, "settings.custom_status", "read")) redirect("/dashboard");

  const statuses = await listCustomStatuses(s.companyId!);
  return (
    <CustomStatusManager
      initial={statuses.map((st) => ({ id: st.id, module: st.module, label: st.label, color: st.color, isActive: st.isActive }))}
      canCreate={can(s.permissions, "settings.custom_status", "create")}
      canUpdate={can(s.permissions, "settings.custom_status", "update")}
      canDelete={can(s.permissions, "settings.custom_status", "delete")}
    />
  );
}
