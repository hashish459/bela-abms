import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { nextNumber } from "@/server/accounts/gl";
import type { GoodsReceiptCreate } from "./schemas";

const orNull = (v?: string) => (v && v.length ? v : null);

export async function listGoodsReceipts(
  companyId: string,
  fiscalYearId: string | null,
  opts: { page?: number } = {},
) {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = 15;
  const where: Prisma.GoodsReceiptWhereInput = {
    companyId,
    deletedAt: null,
    ...(fiscalYearId ? { fiscalYearId } : {}),
  };
  const [rows, total] = await Promise.all([
    db.goodsReceipt.findMany({
      where,
      orderBy: [{ date: "desc" }, { number: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true, number: true, date: true, supplierName: true,
        purchaseOrder: { select: { number: true } },
        items: { select: { qtyOrdered: true, qtyReceived: true } },
      },
    }),
    db.goodsReceipt.count({ where }),
  ]);
  return {
    rows: rows.map((r) => ({
      id: r.id,
      number: r.number,
      date: r.date.toISOString().slice(0, 10),
      supplier: r.supplierName ?? "—",
      purchaseOrderNumber: r.purchaseOrder?.number ?? null,
      qtyOrdered: r.items.reduce((a, it) => a + Number(it.qtyOrdered ?? 0), 0),
      qtyReceived: r.items.reduce((a, it) => a + Number(it.qtyReceived), 0),
    })),
    total, page, pageSize,
  };
}

/** Physical-receipt reconciliation (Purchase › Goods Received) — deliberately
 * posts no stock or GL. The Purchase Invoice still owns both (its own
 * `createPurchaseInvoice`), so a GRN can never double-count what the invoice
 * already books; this is purely the paper trail / ordered-vs-received check
 * that happens before the supplier's invoice arrives. */
export async function createGoodsReceipt(
  companyId: string,
  fiscalYearId: string,
  actorId: string,
  input: GoodsReceiptCreate,
) {
  return db.$transaction(async (tx) => {
    const supplier = orNull(input.supplierLedgerId)
      ? await tx.ledger.findFirst({ where: { id: input.supplierLedgerId, companyId }, select: { id: true, name: true } })
      : null;
    const fy = await tx.fiscalYear.findUnique({ where: { id: fiscalYearId }, select: { name: true } });
    const seq = await nextNumber(tx, companyId, fiscalYearId, "goods_receipt:GRN");
    const number = `GRN-${fy!.name.replace("-", "/")}-${String(seq).padStart(4, "0")}`;

    const doc = await tx.goodsReceipt.create({
      data: {
        companyId, fiscalYearId, number,
        date: new Date(input.date),
        supplierLedgerId: supplier?.id ?? null,
        supplierName: supplier?.name ?? orNull(input.supplierName),
        purchaseOrderId: orNull(input.purchaseOrderId),
        notes: orNull(input.notes),
        createdById: actorId,
        items: {
          create: input.items.map((l, i) => ({
            productId: orNull(l.productId),
            description: l.description,
            qtyOrdered: l.qtyOrdered ?? null,
            qtyReceived: l.qtyReceived,
            order: i,
          })),
        },
      },
    });
    await writeAudit({ userId: actorId, companyId, action: "CREATE", entity: "GoodsReceipt", entityId: doc.id, meta: { number } });
    return { id: doc.id, number };
  });
}
