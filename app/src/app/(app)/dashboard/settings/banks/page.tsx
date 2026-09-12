import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { listBanks } from "@/server/settings/service";
import { BanksManager } from "./banks-manager";

export const metadata = { title: "Banks — Bela ABMS" };

export default async function BanksPage() {
  const s = (await getSession())!;
  if (!can(s.permissions, "settings.banks", "read")) redirect("/dashboard");

  const banks = await listBanks(s.companyId!);
  return (
    <BanksManager
      initial={banks.map((b) => ({ id: b.id, name: b.name, isActive: b.isActive }))}
      canCreate={can(s.permissions, "settings.banks", "create")}
      canUpdate={can(s.permissions, "settings.banks", "update")}
      canDelete={can(s.permissions, "settings.banks", "delete")}
    />
  );
}
