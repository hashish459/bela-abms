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

/** Find-or-create the batch a purchase receipt lands in. Unique on
 * (companyId, productId, warehouseId, batchNo) — receiving the same batch
 * number again (e.g. a second delivery of the same lot) reuses the row
 * rather than duplicating it; a later expiryDate on the same call updates it. */
export async function resolveOrCreateBatch(
  tx: Tx,
  args: { companyId: string; productId: string; warehouseId: string; batchNo: string; expiryDate?: Date | null },
): Promise<string> {
  const batch = await tx.productBatch.upsert({
    where: {
      companyId_productId_warehouseId_batchNo: {
        companyId: args.companyId, productId: args.productId, warehouseId: args.warehouseId, batchNo: args.batchNo,
      },
    },
    create: {
      companyId: args.companyId, productId: args.productId, warehouseId: args.warehouseId,
      batchNo: args.batchNo, expiryDate: args.expiryDate ?? null,
    },
    update: args.expiryDate ? { expiryDate: args.expiryDate } : {},
    select: { id: true },
  });
  return batch.id;
}

/** Batches of a product with stock on hand in a warehouse, oldest expiry first (FEFO) —
 * feeds the Sales line editor's batch picker. */
export async function availableBatches(companyId: string, productId: string, warehouseId: string) {
  const batches = await db.productBatch.findMany({
    where: { companyId, productId, warehouseId },
    orderBy: [{ expiryDate: "asc" }, { batchNo: "asc" }],
  });
  if (!batches.length) return [];

  const movements = await db.stockMovement.groupBy({
    by: ["batchId"],
    where: { companyId, productId, warehouseId, batchId: { in: batches.map((b) => b.id) } },
    _sum: { qty: true },
  });
  const qtyByBatch = new Map(movements.map((m) => [m.batchId, D(m._sum.qty ?? 0)]));

  return batches
    .map((b) => ({
      id: b.id,
      batchNo: b.batchNo,
      expiryDate: b.expiryDate ? b.expiryDate.toISOString().slice(0, 10) : null,
      onHand: (qtyByBatch.get(b.id) ?? D(0)).toFixed(3),
    }))
    .filter((b) => Number(b.onHand) > 0);
}

/** Batch Wise Stock Summary — on-hand quantity per product/warehouse/batch lot. */
export async function batchWiseStockSummary(companyId: string, opts: { search?: string } = {}) {
  const batches = await db.productBatch.findMany({
    where: {
      companyId,
      ...(opts.search
        ? {
            OR: [
              { batchNo: { contains: opts.search, mode: "insensitive" } },
              { product: { name: { contains: opts.search, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    orderBy: [{ product: { name: "asc" } }, { batchNo: "asc" }],
    select: {
      id: true, batchNo: true, expiryDate: true,
      product: { select: { id: true, name: true, sku: true, unit: { select: { shortName: true } } } },
      warehouse: { select: { name: true } },
    },
  });
  if (!batches.length) return [];

  const movements = await db.stockMovement.groupBy({
    by: ["batchId"],
    where: { companyId, batchId: { in: batches.map((b) => b.id) } },
    _sum: { qty: true },
  });
  const qtyByBatch = new Map(movements.map((m) => [m.batchId, D(m._sum.qty ?? 0)]));

  return batches.map((b) => ({
    batchId: b.id,
    productName: b.product.name,
    sku: b.product.sku,
    unit: b.product.unit.shortName,
    warehouse: b.warehouse.name,
    batchNo: b.batchNo,
    expiryDate: b.expiryDate ? b.expiryDate.toISOString().slice(0, 10) : null,
    onHand: (qtyByBatch.get(b.id) ?? D(0)).toFixed(3),
  }));
}

/** Expiry Management ("Near Expiry Report") — batches with stock on hand, bucketed by how
 * close their expiry is. `withinDays` controls the NEAR_EXPIRY cutoff (default 90). */
export async function expiryManagement(companyId: string, opts: { withinDays?: number } = {}) {
  const withinDays = opts.withinDays ?? 90;
  const rows = await batchWiseStockSummary(companyId);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return rows
    .filter((r) => r.expiryDate && Number(r.onHand) > 0)
    .map((r) => {
      const expiry = new Date(r.expiryDate!);
      const daysToExpiry = Math.round((expiry.getTime() - today.getTime()) / 86_400_000);
      const status = daysToExpiry < 0 ? "EXPIRED" : daysToExpiry <= withinDays ? "NEAR_EXPIRY" : "OK";
      return { ...r, daysToExpiry, status };
    })
    .filter((r) => r.status !== "OK")
    .sort((a, b) => a.daysToExpiry - b.daysToExpiry);
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

/**
 * Every stock movement across every product/warehouse/kind (Inventory ›
 * Inventory Transfer). Distinct from Warehouse Transfer's create+own-history
 * view — reinterpreted as the system-wide movement ledger, since a second
 * transfer-creation screen would just duplicate it (see Docs/PROGRESS.md).
 */
export async function stockMovementLedger(
  companyId: string,
  opts: { productId?: string; warehouseId?: string; kind?: StockMovementKind; from?: Date; to?: Date; page?: number } = {},
) {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = 30;
  const where: Prisma.StockMovementWhereInput = {
    companyId,
    ...(opts.productId ? { productId: opts.productId } : {}),
    ...(opts.warehouseId ? { warehouseId: opts.warehouseId } : {}),
    ...(opts.kind ? { kind: opts.kind } : {}),
    ...(opts.from || opts.to
      ? { date: { ...(opts.from ? { gte: opts.from } : {}), ...(opts.to ? { lte: opts.to } : {}) } }
      : {}),
  };
  const [rows, total] = await Promise.all([
    db.stockMovement.findMany({
      where,
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true, date: true, kind: true, qty: true, sourceType: true, narration: true,
        product: { select: { name: true, sku: true } },
        warehouse: { select: { name: true } },
      },
    }),
    db.stockMovement.count({ where }),
  ]);
  return {
    rows: rows.map((r) => ({
      id: r.id,
      date: r.date.toISOString().slice(0, 10),
      kind: r.kind,
      product: `${r.product.sku} — ${r.product.name}`,
      warehouse: r.warehouse.name,
      qty: D(r.qty).toFixed(3),
      source: r.sourceType ?? "—",
      narration: r.narration,
    })),
    total, page, pageSize,
  };
}

export { nextNumber };
