import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { errors } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { nextNumber } from "@/server/accounts/gl";
import { postStockMovement } from "@/server/inventory/stock";
import type { WarehouseTransferCreate } from "./schemas";

const orNull = (v?: string) => (v && v.length ? v : null);

export async function listWarehouseTransfers(
  companyId: string,
  fiscalYearId: string | null,
  opts: { page?: number } = {},
) {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = 15;
  const where: Prisma.WarehouseTransferWhereInput = {
    companyId,
    deletedAt: null,
    ...(fiscalYearId ? { fiscalYearId } : {}),
  };
  const [rows, total] = await Promise.all([
    db.warehouseTransfer.findMany({
      where,
      orderBy: [{ date: "desc" }, { number: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true, number: true, date: true,
        fromWarehouse: { select: { name: true } },
        toWarehouse: { select: { name: true } },
        items: { select: { qty: true } },
      },
    }),
    db.warehouseTransfer.count({ where }),
  ]);
  return {
    rows: rows.map((r) => ({
      id: r.id,
      number: r.number,
      date: r.date.toISOString().slice(0, 10),
      fromWarehouse: r.fromWarehouse.name,
      toWarehouse: r.toWarehouse.name,
      itemCount: r.items.length,
    })),
    total, page, pageSize,
  };
}

/** Inter-warehouse stock move (Inventory › Warehouse Transfer) — a real
 * physical movement, so it posts a genuine TRANSFER_OUT + TRANSFER_IN pair
 * per line. No GL and no unit cost tracked, matching InventoryAdjustment's
 * existing precedent: a transfer changes where stock sits, never its total
 * value. `postStockMovement`'s own on-hand check (allowNegative left false)
 * blocks transferring more than what's actually in the source warehouse. */
export async function createWarehouseTransfer(
  companyId: string,
  fiscalYearId: string,
  actorId: string,
  input: WarehouseTransferCreate,
) {
  return db.$transaction(async (tx) => {
    const warehouses = await tx.warehouse.findMany({
      where: { id: { in: [input.fromWarehouseId, input.toWarehouseId] }, companyId, deletedAt: null },
      select: { id: true },
    });
    if (warehouses.length !== 2) throw errors.validation(null, "Invalid warehouse");

    const fy = await tx.fiscalYear.findUnique({ where: { id: fiscalYearId }, select: { name: true } });
    const seq = await nextNumber(tx, companyId, fiscalYearId, "warehouse_transfer:WT");
    const number = `WT-${fy!.name.replace("-", "/")}-${String(seq).padStart(4, "0")}`;

    const doc = await tx.warehouseTransfer.create({
      data: {
        companyId, fiscalYearId, number,
        date: new Date(input.date),
        fromWarehouseId: input.fromWarehouseId,
        toWarehouseId: input.toWarehouseId,
        notes: orNull(input.notes),
        createdById: actorId,
        items: {
          create: input.items.map((l, i) => ({
            productId: l.productId,
            qty: l.qty,
            order: i,
          })),
        },
      },
    });

    await postStockMovement(tx, {
      companyId, fiscalYearId, date: new Date(input.date), kind: "TRANSFER_OUT",
      sourceType: "WarehouseTransfer", sourceId: doc.id, createdById: actorId,
      lines: input.items.map((l) => ({ productId: l.productId, warehouseId: input.fromWarehouseId, qty: l.qty })),
    });
    await postStockMovement(tx, {
      companyId, fiscalYearId, date: new Date(input.date), kind: "TRANSFER_IN",
      sourceType: "WarehouseTransfer", sourceId: doc.id, createdById: actorId,
      lines: input.items.map((l) => ({ productId: l.productId, warehouseId: input.toWarehouseId, qty: l.qty })),
    });

    await writeAudit({ userId: actorId, companyId, action: "CREATE", entity: "WarehouseTransfer", entityId: doc.id, meta: { number } });
    return { id: doc.id, number };
  });
}
