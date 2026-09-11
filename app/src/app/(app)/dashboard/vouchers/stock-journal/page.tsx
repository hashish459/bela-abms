import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { db } from "@/lib/db";
import { listVouchers } from "@/server/accounts/service";
import { activeFiscalYearId } from "@/lib/fiscal-year";
import { StockJournalWorkspace } from "./stock-journal-workspace";

export const metadata = { title: "Stock Journal — Bela ABMS" };

export default async function StockJournalPage() {
  const s = (await getSession())!;
  if (!can(s.permissions, "vouchers.stock_journal", "read")) redirect("/dashboard");

  const fyId = await activeFiscalYearId(s.companyId!).catch(() => null);
  const [list, warehouses] = await Promise.all([
    listVouchers(s.companyId!, fyId, "STOCK", { page: 1 }),
    db.warehouse.findMany({
      where: { companyId: s.companyId!, deletedAt: null, isActive: true },
      select: { id: true, name: true },
      orderBy: { isDefault: "desc" },
    }),
  ]);

  return (
    <StockJournalWorkspace
      initial={list}
      warehouses={warehouses}
      canCreate={can(s.permissions, "vouchers.stock_journal", "create")}
      hasFiscalYear={!!fyId}
    />
  );
}
