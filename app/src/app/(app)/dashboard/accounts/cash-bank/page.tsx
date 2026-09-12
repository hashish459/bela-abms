import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { activeFiscalYearId } from "@/lib/fiscal-year";
import { cashAndBankAccounts } from "@/server/accounts/service";
import { CashBankView } from "./cash-bank-view";

export const metadata = { title: "Cash & Bank Account — Bela ABMS" };

export default async function CashBankPage() {
  const s = (await getSession())!;
  if (!can(s.permissions, "accounts.cash_and_bank_account", "read")) redirect("/dashboard");
  const fyId = await activeFiscalYearId(s.companyId!).catch(() => null);

  const rows = await cashAndBankAccounts(s.companyId!, fyId);

  return <CashBankView rows={rows} hasFiscalYear={!!fyId} />;
}
