import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { SettingsNav, type SettingsTab } from "./settings-nav";

// Ordered like the reference Settings sidebar. Only tabs the user can read are shown;
// tabs whose page is not built yet fall through to the catch-all stub.
const ALL_TABS: (SettingsTab & { perm: string })[] = [
  { title: "Company Info", href: "/dashboard/settings/company-info", perm: "settings.company_info" },
  { title: "User & Permissions", href: "/dashboard/settings/users", perm: "settings.users" },
  { title: "Fiscal Year", href: "/dashboard/settings/fiscal-year", perm: "settings.fiscal_year" },
  { title: "Tax", href: "/dashboard/settings/tax", perm: "settings.tax" },
  { title: "Custom Fields", href: "/dashboard/settings/custom-fields", perm: "settings.custom_fields" },
  { title: "Custom Status", href: "/dashboard/settings/custom-status", perm: "settings.custom_status" },
  { title: "Banks", href: "/dashboard/settings/banks", perm: "settings.banks" },
  { title: "Bank Detail", href: "/dashboard/settings/bank-detail", perm: "settings.bank_detail" },
  { title: "Bill Footer", href: "/dashboard/settings/bill-footer", perm: "settings.bill_footer" },
  { title: "Barcode", href: "/dashboard/settings/barcode", perm: "settings.barcode" },
  { title: "Invoice Setting", href: "/dashboard/settings/invoice-setting", perm: "settings.invoice_setting" },
  { title: "Invoice Import Setting", href: "/dashboard/settings/invoice-import-setting", perm: "settings.invoice_import_setting" },
  { title: "Backup Data", href: "/dashboard/settings/backup", perm: "settings.backup_data" },
  { title: "Signin & Security", href: "/dashboard/settings/signin-security", perm: "settings.signin_and_security" },
];

export default async function SettingsLayout({ children }: LayoutProps<"/">) {
  const session = (await getSession())!;
  const tabs = ALL_TABS.filter((t) => can(session.permissions, t.perm, "read")).map(
    ({ title, href }) => ({ title, href }),
  );

  return (
    <div className="lg:flex lg:gap-6">
      <div className="mb-4 lg:mb-0">
        <SettingsNav tabs={tabs} />
      </div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
