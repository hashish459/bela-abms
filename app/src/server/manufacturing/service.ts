import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { errors } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { postVoucher, nextNumber, formatVoucherNumber } from "@/server/accounts/gl";
import { postStockMovement } from "@/server/inventory/stock";
import { weightedAverageCost } from "@/server/inventory/cost";
import { calcProductionCost } from "./calc";
import { MFG_LEDGER } from "./ledgers";
import type { BomCreate, ProductionOrderCreate } from "./schemas";

type Tx = Prisma.TransactionClient;
const D = (n: Prisma.Decimal.Value) => new Prisma.Decimal(n);
const orNull = (v?: string) => (v && v.length ? v : null);

async function ledgerId(tx: Tx, companyId: string, code: string): Promise<string> {
  const l = await tx.ledger.findFirst({ where: { companyId, code, deletedAt: null }, select: { id: true } });
  if (!l) throw errors.validation(null, `System account ${code} is missing — re-run the seed`);
  return l.id;
}

/** FINISHED_GOODS -> Finished Inventory; RAW_MATERIAL -> Raw Material Inventory. */
function inventoryLedgerCodeFor(role: string): string {
  return role === "RAW_MATERIAL" ? MFG_LEDGER.RAW_MATERIAL_INVENTORY : MFG_LEDGER.FINISHED_INVENTORY;
}

/* ───────────────────────────────  BOM  ─────────────────────────────────── */

export async function createBom(companyId: string, actorId: string, input: BomCreate) {
  return db.$transaction(async (tx) => {
    const output = await tx.product.findFirst({
      where: { id: input.outputProductId, companyId, deletedAt: null },
      select: { id: true, kind: true, inventoryRole: true, name: true },
    });
    if (!output) throw errors.validation(null, "Output product not found");
    if (output.kind !== "GOODS") throw errors.validation(null, "The output must be a physical (GOODS) product");
    if (output.inventoryRole !== "FINISHED_GOODS")
      throw errors.validation(null, `"${output.name}" is marked Raw Material — a BOM must produce a Finished Goods product`);

    const componentIds = [...new Set(input.components.map((c) => c.componentProductId))];
    const components = await tx.product.findMany({
      where: { id: { in: componentIds }, companyId, deletedAt: null },
      select: { id: true, kind: true },
    });
    if (components.length !== componentIds.length) throw errors.validation(null, "One or more components were not found");
    if (components.some((c) => c.kind !== "GOODS")) throw errors.validation(null, "Every component must be a physical (GOODS) product");
    if (componentIds.includes(input.outputProductId)) throw errors.validation(null, "A product cannot be a component of its own BOM");

    const dup = await tx.billOfMaterial.findFirst({
      where: { companyId, outputProductId: input.outputProductId, name: input.name, deletedAt: null },
    });
    if (dup) throw errors.conflict(`A BOM named "${input.name}" already exists for this product`);

    const bom = await tx.billOfMaterial.create({
      data: {
        companyId, outputProductId: input.outputProductId, name: input.name,
        outputQty: D(input.outputQty), laborCostPerBatch: D(input.laborCostPerBatch),
        notes: orNull(input.notes), createdById: actorId,
        components: {
          create: input.components.map((c, i) => ({
            componentProductId: c.componentProductId, qtyPerBatch: D(c.qtyPerBatch), order: i,
          })),
        },
      },
    });

    await writeAudit({ userId: actorId, companyId, action: "CREATE", entity: "BillOfMaterial", entityId: bom.id, meta: { name: input.name } });
    return { id: bom.id, name: bom.name };
  });
}

export async function listBoms(companyId: string) {
  const boms = await db.billOfMaterial.findMany({
    where: { companyId, deletedAt: null },
    orderBy: { name: "asc" },
    include: { components: { orderBy: { order: "asc" } } },
  });

  const productIds = [...new Set(boms.flatMap((b) => [b.outputProductId, ...b.components.map((c) => c.componentProductId)]))];
  const products = productIds.length
    ? await db.product.findMany({ where: { id: { in: productIds } }, select: { id: true, name: true, sku: true, unit: { select: { shortName: true } } } })
    : [];
  const byId = new Map(products.map((p) => [p.id, p]));

  return boms.map((b) => ({
    id: b.id, name: b.name, isActive: b.isActive,
    outputProductId: b.outputProductId,
    outputProductName: byId.get(b.outputProductId)?.name ?? "—",
    outputQty: b.outputQty.toFixed(3),
    outputUnit: byId.get(b.outputProductId)?.unit.shortName ?? "",
    laborCostPerBatch: b.laborCostPerBatch.toFixed(2),
    components: b.components.map((c) => ({
      id: c.id, componentProductId: c.componentProductId,
      componentName: byId.get(c.componentProductId)?.name ?? "—",
      qtyPerBatch: c.qtyPerBatch.toFixed(3),
      unit: byId.get(c.componentProductId)?.unit.shortName ?? "",
    })),
  }));
}

export async function getBom(companyId: string, id: string) {
  const bom = await db.billOfMaterial.findFirst({
    where: { id, companyId, deletedAt: null },
    include: { components: { orderBy: { order: "asc" } } },
  });
  if (!bom) throw errors.notFound("BOM not found");
  return bom;
}

/* ───────────────────────────  Production Order  ────────────────────────── */

export async function createProductionOrder(
  companyId: string,
  fiscalYearId: string,
  actorId: string,
  input: ProductionOrderCreate,
) {
  return db.$transaction(async (tx) => {
    const fy = await tx.fiscalYear.findUnique({ where: { id: fiscalYearId }, select: { name: true, isClosed: true } });
    if (!fy) throw errors.badRequest("Invalid fiscal year");
    if (fy.isClosed) throw errors.badRequest("Fiscal year is closed");

    const bom = await tx.billOfMaterial.findFirst({
      where: { id: input.bomId, companyId, deletedAt: null },
      include: { components: { orderBy: { order: "asc" } } },
    });
    if (!bom) throw errors.validation(null, "BOM not found");
    if (!bom.isActive) throw errors.validation(null, "This BOM is inactive");

    const warehouse = await tx.warehouse.findFirst({ where: { id: input.warehouseId, companyId, deletedAt: null }, select: { id: true } });
    if (!warehouse) throw errors.validation(null, "Warehouse not found");

    const productIds = [bom.outputProductId, ...bom.components.map((c) => c.componentProductId)];
    const products = await tx.product.findMany({
      where: { id: { in: productIds }, companyId, deletedAt: null },
      select: { id: true, name: true, inventoryRole: true },
    });
    const productById = new Map(products.map((p) => [p.id, p]));
    const output = productById.get(bom.outputProductId);
    if (!output) throw errors.validation(null, "Output product no longer exists");

    // Weighted-average cost of each component AT THIS MOMENT — the standard perpetual-
    // inventory valuation, same function every sale/return already uses.
    const componentsWithCost = await Promise.all(
      bom.components.map(async (c) => ({
        componentProductId: c.componentProductId,
        qtyPerBatch: c.qtyPerBatch,
        unitCost: await weightedAverageCost(companyId, c.componentProductId, tx),
      })),
    );

    const cost = calcProductionCost(componentsWithCost, input.batches, bom.laborCostPerBatch, bom.outputQty);
    if (D(cost.outputQty).lte(0)) throw errors.validation(null, "Output quantity must be greater than zero");

    const seq = await nextNumber(tx, companyId, fiscalYearId, "manufacture:PRODUCTION_ORDER");
    const number = formatVoucherNumber("MANUFACTURE", fy.name, seq);

    // 1. Consume components — stock OUT, blocked if there isn't enough raw material on hand.
    await postStockMovement(tx, {
      companyId, fiscalYearId, date: new Date(input.date), kind: "MANUFACTURE_OUT",
      sourceType: "ProductionOrder", createdById: actorId,
      lines: cost.lines.map((l) => ({
        productId: l.componentProductId, warehouseId: input.warehouseId, qty: l.qty, unitCost: l.unitCost,
      })),
    });

    // 2. Produce the output — stock IN at the rolled-up unit cost (material + labor) / qty.
    await postStockMovement(tx, {
      companyId, fiscalYearId, date: new Date(input.date), kind: "MANUFACTURE_IN",
      sourceType: "ProductionOrder", createdById: actorId,
      lines: [{ productId: bom.outputProductId, warehouseId: input.warehouseId, qty: cost.outputQty, unitCost: cost.unitCost }],
    });

    // 3. GL — Dr WIP (material+labor) / Cr component ledgers + Cr Direct Labor,
    //    then Dr Finished/Raw-role ledger for the output / Cr WIP. WIP nets to zero within
    //    this one voucher but is posted through explicitly, matching the reference COA's own
    //    "WIP Inventory" ledger rather than netting it away invisibly.
    const wipId = await ledgerId(tx, companyId, MFG_LEDGER.WIP_INVENTORY);
    const creditByLedger = new Map<string, Prisma.Decimal>();
    for (const l of cost.lines) {
      const role = productById.get(l.componentProductId)?.inventoryRole ?? "RAW_MATERIAL";
      const code = inventoryLedgerCodeFor(role);
      creditByLedger.set(code, (creditByLedger.get(code) ?? D(0)).add(l.amount));
    }

    const lines: { ledgerId: string; debit?: string; credit?: string; narration?: string }[] = [
      { ledgerId: wipId, debit: D(cost.materialCost).add(cost.laborCost).toFixed(2), narration: `${number} — materials + labor` },
    ];
    for (const [code, amount] of creditByLedger) {
      lines.push({ ledgerId: await ledgerId(tx, companyId, code), credit: amount.toFixed(2) });
    }
    if (D(cost.laborCost).gt(0)) {
      lines.push({ ledgerId: await ledgerId(tx, companyId, MFG_LEDGER.DIRECT_LABOR), credit: cost.laborCost });
    }
    const outputLedgerCode = inventoryLedgerCodeFor(output.inventoryRole);
    lines.push({ ledgerId: await ledgerId(tx, companyId, outputLedgerCode), debit: cost.totalCost, narration: output.name });
    lines.push({ ledgerId: wipId, credit: cost.totalCost, narration: `${number} — completed` });

    const voucher = await postVoucher(tx, {
      companyId, fiscalYearId, date: new Date(input.date), type: "MANUFACTURE",
      narration: `Production order ${number} — ${bom.name} × ${input.batches}`,
      sourceType: "ProductionOrder", createdById: actorId, lines,
    });

    const order = await tx.productionOrder.create({
      data: {
        companyId, fiscalYearId, number, date: new Date(input.date),
        bomId: bom.id, outputProductId: bom.outputProductId, warehouseId: input.warehouseId,
        batches: D(input.batches), outputQty: D(cost.outputQty),
        materialCost: D(cost.materialCost), laborCost: D(cost.laborCost), totalCost: D(cost.totalCost),
        unitCost: D(cost.unitCost), notes: orNull(input.notes), voucherId: voucher.id, createdById: actorId,
        items: {
          create: cost.lines.map((l) => ({
            componentProductId: l.componentProductId, qty: D(l.qty), unitCost: D(l.unitCost), amount: D(l.amount),
          })),
        },
      },
    });

    await writeAudit({
      userId: actorId, companyId, action: "CREATE", entity: "ProductionOrder", entityId: order.id,
      meta: { number, totalCost: cost.totalCost, outputQty: cost.outputQty },
    });

    return { id: order.id, number, outputQty: cost.outputQty, totalCost: cost.totalCost, unitCost: cost.unitCost };
  });
}

export async function listProductionOrders(companyId: string, fiscalYearId: string | null) {
  const orders = await db.productionOrder.findMany({
    where: { companyId, ...(fiscalYearId ? { fiscalYearId } : {}) },
    orderBy: [{ date: "desc" }, { number: "desc" }],
    include: { bom: { select: { name: true } } },
  });

  const productIds = [...new Set(orders.map((o) => o.outputProductId))];
  const products = productIds.length
    ? await db.product.findMany({ where: { id: { in: productIds } }, select: { id: true, name: true } })
    : [];
  const byId = new Map(products.map((p) => [p.id, p.name]));

  return orders.map((o) => ({
    id: o.id, number: o.number, date: o.date.toISOString().slice(0, 10), bomName: o.bom.name,
    outputProductName: byId.get(o.outputProductId) ?? "—",
    batches: o.batches.toFixed(3), outputQty: o.outputQty.toFixed(3),
    materialCost: o.materialCost.toFixed(2), laborCost: o.laborCost.toFixed(2),
    totalCost: o.totalCost.toFixed(2), unitCost: o.unitCost.toFixed(4),
  }));
}

export async function getProductionOrder(companyId: string, id: string) {
  const order = await db.productionOrder.findFirst({
    where: { id, companyId },
    include: { bom: { select: { name: true } }, items: true },
  });
  if (!order) throw errors.notFound("Production order not found");

  const productIds = [order.outputProductId, ...order.items.map((i) => i.componentProductId)];
  const products = await db.product.findMany({ where: { id: { in: productIds } }, select: { id: true, name: true, sku: true } });
  const byId = new Map(products.map((p) => [p.id, p]));

  return {
    id: order.id, number: order.number, date: order.date.toISOString().slice(0, 10), bomName: order.bom.name,
    outputProductName: byId.get(order.outputProductId)?.name ?? "—",
    batches: order.batches.toFixed(3), outputQty: order.outputQty.toFixed(3),
    materialCost: order.materialCost.toFixed(2), laborCost: order.laborCost.toFixed(2),
    totalCost: order.totalCost.toFixed(2), unitCost: order.unitCost.toFixed(4),
    notes: order.notes,
    items: order.items.map((i) => ({
      componentName: byId.get(i.componentProductId)?.name ?? "—",
      qty: i.qty.toFixed(3), unitCost: i.unitCost.toFixed(4), amount: i.amount.toFixed(2),
    })),
  };
}
