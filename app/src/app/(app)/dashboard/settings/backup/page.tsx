import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { BackupDataView } from "./backup-data-view";

export const metadata = { title: "Backup Data — Bela ABMS" };

export default async function BackupDataPage() {
  const s = (await getSession())!;
  if (!can(s.permissions, "settings.backup_data", "read")) redirect("/dashboard");
  return <BackupDataView />;
}
