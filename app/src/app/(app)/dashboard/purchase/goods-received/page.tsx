import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { db } from "@/lib/db";
import { activeFiscalYearId } from "@/lib/fiscal-year";
import { listGoodsReceipts } from "@/server/goods-receipt/service";
import { listContacts } from "@/server/accounts/service";
import { GoodsReceivedWorkspace } from "./goods-received-workspace";

export const metadata = { title: "Goods Received — Bela ABMS" };

export default async function GoodsReceivedPage() {
  const s = (await getSession())!;
  if (!can(s.permissions, "purchase.goods_received", "read")) redirect("/dashboard");
  const fyId = await activeFiscalYearId(s.companyId!).catch(() => null);

  const [list, suppliers, openOrders] = await Promise.all([
    listGoodsReceipts(s.companyId!, fyId, { page: 1 }),
    listContacts(s.companyId!, "SUPPLIER"),
    db.purchaseDoc.findMany({
      where: { companyId: s.companyId!, type: "PURCHASE_ORDER", status: { not: "CONVERTED" } },
      orderBy: { date: "desc" },
      take: 30,
      select: {
        id: true, number: true, supplierLedgerId: true, supplierName: true,
        items: { orderBy: { order: "asc" }, select: { productId: true, description: true, qty: true } },
      },
    }),
  ]);

  return (
    <GoodsReceivedWorkspace
      initial={list}
      suppliers={suppliers.map((c) => ({ id: c.id, name: c.name }))}
      openOrders={openOrders.map((o) => ({
        id: o.id, number: o.number, supplierLedgerId: o.supplierLedgerId, supplierName: o.supplierName,
        items: o.items.map((it) => ({ productId: it.productId, description: it.description, qty: Number(it.qty) })),
      }))}
      canCreate={can(s.permissions, "purchase.goods_received", "create")}
    />
  );
}
