import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { getInvoiceSetting } from "@/server/settings/service";
import { InvoiceSettingForm } from "./invoice-setting-form";

export const metadata = { title: "Invoice Setting — Bela ABMS" };

export default async function InvoiceSettingPage() {
  const s = (await getSession())!;
  if (!can(s.permissions, "settings.invoice_setting", "read")) redirect("/dashboard");

  const setting = await getInvoiceSetting(s.companyId!);
  return (
    <InvoiceSettingForm
      initial={setting}
      canUpdate={can(s.permissions, "settings.invoice_setting", "update")}
    />
  );
}
