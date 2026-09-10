import "server-only";
import { Prisma, type StockMovementKind } from "@prisma/client";
import { db } from "@/lib/db";
import { errors } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { nextNumber } from "@/server/accounts/gl";

type Tx = Prisma.TransactionClient;
const D = (n: Prisma.Decimal.Value) => new Prisma.Decimal(n);

/** IN kinds add stock, OUT kinds remove it. */
const OUT_KINDS: StockMovementKind[] = [
  "SALE",
  "PURCHASE_RETURN",
  "ADJUSTMENT_OUT",
  "TRANSFER_OUT",
  "MANUFACTURE_OUT",
];

export type StockMovementInput = {
  productId: string;
  warehouseId: string;
  batchId?: string | null;
  qty: number | string; // always positive; direction comes from `kind`
  unitCost?: number | string;
  narration?: string;
};

/**
 * The single writer of stock quantity. Records one signed StockMovement per line.
 * Only GOODS products carry stock; SERVICE/EXPENSE are rejected.
 */
export async function postStockMovement(
  tx: Tx,
  args: {
    companyId: string;
    fiscalYearId?: string | null;
    date: Date;
    kind: StockMovementKind;
    lines: StockMovementInput[];
    sourceType?: string;
    sourceId?: string;
    createdById?: string;
    allowNegative?: boolean; // sales may be blocked from overselling
  },
) {
  if (args.lines.length === 0) return [];

  const productIds = [...new Set(args.lines.map((l) => l.productId))];
  const products = await tx.product.findMany({
    where: { id: { in: productIds }, companyId: args.companyId, deletedAt: null },
    select: { id: true, kind: true, name: true },
  });
  const pById = new Map(products.map((p) => [p.id, p]));

  const sign = OUT_KINDS.includes(args.kind) ? -1 : 1;
  const created = [];

  for (const l of args.lines) {
    const product = pById.get(l.productId);
    if (!product) throw errors.validation(null, "Invalid product in stock movement");
    if (product.kind !== "GOODS")
      throw errors.validation(null, `"${product.name}" is a ${product.kind.toLowerCase()} and has no stock`);

    const qty = D(l.qty).abs();
    if (qty.lte(0)) throw errors.validation(null, "Stock quantity must be greater than zero");

    const signedQty = qty.mul(sign);

    if (!args.allowNegative && sign < 0) {
      const onHand = await onHandQty(
        args.companyId,
        l.productId,
        l.warehouseId,
        l.batchId ?? null,
        tx,
      );
      if (onHand.add(signedQty).lt(0))
        throw errors.validation(
          null,
          `Not enough stock of "${product.name}" (on hand ${onHand.toFixed(3)}, need ${qty.toFixed(3)})`,
        );
    }

    const row = await tx.stockMovement.create({
      data: {
        companyId: args.companyId,
        fiscalYearId: args.fiscalYearId ?? null,
        productId: l.productId,
        warehouseId: l.warehouseId,
        batchId: l.batchId ?? null,
        date: args.date,
        kind: args.kind,
        qty: signedQty,
        unitCost: D(l.unitCost ?? 0),
        sourceType: args.sourceType ?? null,
        sourceId: args.sourceId ?? null,
        narration: l.narration ?? null,
        createdById: args.createdById ?? null,
      },
    });
    created.push(row);
  }

  await writeAudit({
    userId: args.createdById,
    companyId: args.companyId,
    action: "STOCK_MOVEMENT",
    entity: args.sourceType ?? "StockMovement",
    entityId: args.sourceId,
    meta: { kind: args.kind, lines: created.length },
  });

  return created;
}

/** On-hand for one product/warehouse[/batch]. */
export async function onHandQty(
  companyId: string,
  productId: string,
  warehouseId: string,
  batchId: string | null,
  client: Tx | typeof db = db,
): Promise<Prisma.Decimal> {
  const agg = await client.stockMovement.aggregate({
    where: {
      companyId,
      productId,
      warehouseId,
      ...(batchId ? { batchId } : {}),
    },
    _sum: { qty: true },
  });
  return D(agg._sum.qty ?? 0);
}

/** Stock summary: on-hand per product across all warehouses. */
export async function stockSummary(companyId: string, opts: { search?: string; categoryId?: string } = {}) {
  const products = await db.product.findMany({
    where: {
      companyId,
      deletedAt: null,
      kind: "GOODS",
      ...(opts.search
        ? { OR: [{ name: { contains: opts.search, mode: "insensitive" } }, { sku: { contains: opts.search, mode: "insensitive" } }] }
        : {}),
      ...(opts.categoryId ? { categoryId: opts.categoryId } : {}),
    },
    orderBy: { name: "asc" },
    select: {
      id: true, sku: true, name: true, reorderPoint: true,
      category: { select: { name: true } },
      unit: { select: { shortName: true } },
    },
  });

  const movements = await db.stockMovement.groupBy({
    by: ["productId"],
    where: { companyId, productId: { in: products.map((p) => p.id) } },
    _sum: { qty: true },
  });
  const qtyById = new Map(movements.map((m) => [m.productId, D(m._sum.qty ?? 0)]));

  return products.map((p) => {
    const onHand = qtyById.get(p.id) ?? D(0);
    return {
      id: p.id,
      sku: p.sku,
      name: p.name,
      category: p.category?.name ?? null,
      unit: p.unit.shortName,
      onHand: onHand.toFixed(3),
      reorderPoint: p.reorderPoint?.toFixed(3) ?? null,
      belowReorder: p.reorderPoint ? onHand.lt(p.reorderPoint) : false,
    };
  });
}

/** Per-warehouse breakdown for one product. */
export async function stockByWarehouse(companyId: string, productId: string) {
  const rows = await db.stockMovement.groupBy({
    by: ["warehouseId"],
    where: { companyId, productId },
    _sum: { qty: true },
  });
  const warehouses = await db.warehouse.findMany({
    where: { companyId, id: { in: rows.map((r) => r.warehouseId) } },
    select: { id: true, name: true },
  });
  const nameById = new Map(warehouses.map((w) => [w.id, w.name]));
  return rows.map((r) => ({
    warehouseId: r.warehouseId,
    warehouse: nameById.get(r.warehouseId) ?? "?",
    onHand: D(r._sum.qty ?? 0).toFixed(3),
  }));
}

export { nextNumber };
