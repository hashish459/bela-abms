import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { getBarcodeSetting } from "@/server/settings/service";
import { BarcodeSettingForm } from "./barcode-setting-form";

export const metadata = { title: "Barcode — Bela ABMS" };

export default async function BarcodeSettingPage() {
  const s = (await getSession())!;
  if (!can(s.permissions, "settings.barcode", "read")) redirect("/dashboard");

  const setting = await getBarcodeSetting(s.companyId!);
  return (
    <BarcodeSettingForm
      initial={{ ...setting, prefix: setting.prefix ?? "" }}
      canUpdate={can(s.permissions, "settings.barcode", "update")}
    />
  );
}
