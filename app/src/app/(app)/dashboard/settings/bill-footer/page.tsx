import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { getBillFooter, listBankAccounts } from "@/server/settings/service";
import { BillFooterForm } from "./bill-footer-form";

export const metadata = { title: "Bill Footer — Bela ABMS" };

export default async function BillFooterPage() {
  const s = (await getSession())!;
  if (!can(s.permissions, "settings.bill_footer", "read")) redirect("/dashboard");

  const [footer, accounts] = await Promise.all([
    getBillFooter(s.companyId!),
    listBankAccounts(s.companyId!),
  ]);

  return (
    <BillFooterForm
      initial={footer}
      accounts={accounts.map((a) => ({ id: a.id, label: `${a.bankName} — ${a.accountName} (${a.accountNumber})` }))}
      canUpdate={can(s.permissions, "settings.bill_footer", "update")}
    />
  );
}
