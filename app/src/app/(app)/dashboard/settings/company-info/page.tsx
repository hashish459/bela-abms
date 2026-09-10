import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { getCompanyInfo } from "@/server/settings/service";
import { CompanyInfoForm } from "./company-info-form";

export const metadata = { title: "Company Info — Settings" };

export default async function CompanyInfoPage() {
  const s = (await getSession())!;
  const info = s.companyId ? await getCompanyInfo(s.companyId) : null;
  return (
    <CompanyInfoForm
      initial={info}
      canEdit={can(s.permissions, "settings.company_info", "update")}
    />
  );
}
