import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { listTechnicians } from "@/server/workshop/service";
import { TechnicianManager } from "./technician-manager";

export const metadata = { title: "Technician — Bela ABMS" };

export default async function TechnicianPage() {
  const s = (await getSession())!;
  if (!can(s.permissions, "workshop.technician", "read")) redirect("/dashboard");
  const technicians = await listTechnicians(s.companyId!);
  return (
    <TechnicianManager
      initial={technicians.map((t) => ({
        id: t.id, name: t.name, phone: t.phone, specialization: t.specialization, isActive: t.isActive,
      }))}
      canCreate={can(s.permissions, "workshop.technician", "create")}
      canUpdate={can(s.permissions, "workshop.technician", "update")}
    />
  );
}
