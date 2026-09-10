import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { listUnits } from "@/server/inventory/service";
import { UnitsManager } from "./units-manager";

export const metadata = { title: "Units of Measurement — Bela ABMS" };

export default async function UnitsPage() {
  const s = (await getSession())!;
  if (!can(s.permissions, "inventory.units_of_measurement", "read")) redirect("/dashboard");
  return (
    <UnitsManager
      initial={await listUnits(s.companyId!)}
      canCreate={can(s.permissions, "inventory.units_of_measurement", "create")}
      canUpdate={can(s.permissions, "inventory.units_of_measurement", "update")}
    />
  );
}
