import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { db } from "@/lib/db";
import { activeFiscalYearId } from "@/lib/fiscal-year";
import { listProductionOrders, listBoms } from "@/server/manufacturing/service";
import { ProductionOrderWorkspace } from "./production-order-workspace";

export const metadata = { title: "Production Order — Bela ABMS" };

export default async function ProductionOrderPage() {
  const s = (await getSession())!;
  if (!can(s.permissions, "manufacturing.production_order", "read")) redirect("/dashboard");

  const fyId = await activeFiscalYearId(s.companyId!).catch(() => null);
  const [orders, boms, warehouses] = await Promise.all([
    fyId ? listProductionOrders(s.companyId!, fyId) : [],
    listBoms(s.companyId!),
    db.warehouse.findMany({
      where: { companyId: s.companyId!, deletedAt: null, isActive: true },
      select: { id: true, name: true },
      orderBy: { isDefault: "desc" },
    }),
  ]);

  return (
    <ProductionOrderWorkspace
      initial={orders}
      boms={boms.filter((b) => b.isActive)}
      warehouses={warehouses}
      canCreate={can(s.permissions, "manufacturing.production_order", "create")}
      hasFiscalYear={!!fyId}
    />
  );
}
