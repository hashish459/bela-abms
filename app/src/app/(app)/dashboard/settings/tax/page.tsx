import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { listTaxRates } from "@/server/settings/service";
import { TaxManager } from "./tax-manager";

export const metadata = { title: "Tax — Settings" };

export default async function TaxPage() {
  const s = (await getSession())!;
  const rows = s.companyId ? await listTaxRates(s.companyId) : [];
  return (
    <TaxManager
      initial={rows.map((r) => ({ ...r, ratePct: Number(r.ratePct) }))}
      canCreate={can(s.permissions, "settings.tax", "create")}
      canUpdate={can(s.permissions, "settings.tax", "update")}
      canDelete={can(s.permissions, "settings.tax", "delete")}
    />
  );
}
