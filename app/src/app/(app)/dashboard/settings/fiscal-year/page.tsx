import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { listFiscalYears } from "@/server/settings/service";
import { FiscalYearManager } from "./fiscal-year-manager";

export const metadata = { title: "Fiscal Year — Settings" };

export default async function FiscalYearPage() {
  const s = (await getSession())!;
  const fiscalYears = s.companyId ? await listFiscalYears(s.companyId) : [];
  return (
    <FiscalYearManager
      initial={fiscalYears}
      canCreate={can(s.permissions, "settings.fiscal_year", "create")}
      canUpdate={can(s.permissions, "settings.fiscal_year", "update")}
    />
  );
}
