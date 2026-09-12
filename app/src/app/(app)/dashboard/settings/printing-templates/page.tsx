import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { getCompanyInfo, getInvoiceSetting, getBillFooterForPrint } from "@/server/settings/service";
import { PrintingTemplatesTabs } from "./printing-templates-tabs";

export const metadata = { title: "Printing Templates — Bela ABMS" };

export default async function PrintingTemplatesPage() {
  const s = (await getSession())!;
  if (!can(s.permissions, "settings.printing_templates", "read")) redirect("/dashboard");

  const [company, invoiceSetting, billFooter] = await Promise.all([
    getCompanyInfo(s.companyId!),
    getInvoiceSetting(s.companyId!),
    getBillFooterForPrint(s.companyId!),
  ]);

  return (
    <PrintingTemplatesTabs
      invoiceTemplate={invoiceSetting.template}
      receiptTemplate={invoiceSetting.receiptTemplate}
      company={company}
      invoiceSetting={{
        showHsCode: invoiceSetting.showHsCode,
        showDiscountColumn: invoiceSetting.showDiscountColumn,
        showBankDetails: invoiceSetting.showBankDetails,
        showQrCode: invoiceSetting.showQrCode,
      }}
      billFooter={billFooter}
      canUpdate={can(s.permissions, "settings.printing_templates", "update")}
    />
  );
}
