import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { listVouchers } from "@/server/accounts/service";
import { activeFiscalYearId } from "@/lib/fiscal-year";
import { VoucherWorkspace } from "../voucher-workspace";

export const metadata = { title: "Journal Voucher — Bela ABMS" };

export default async function JournalVoucherPage() {
  const s = (await getSession())!;
  if (!can(s.permissions, "vouchers.journal_voucher", "read")) redirect("/dashboard");

  const fyId = await activeFiscalYearId(s.companyId!).catch(() => null);
  const list = await listVouchers(s.companyId!, fyId, "JOURNAL", { page: 1 });

  return (
    <VoucherWorkspace
      type="JOURNAL"
      title="Journal Voucher"
      initial={list}
      canCreate={can(s.permissions, "vouchers.journal_voucher", "create")}
    />
  );
}
