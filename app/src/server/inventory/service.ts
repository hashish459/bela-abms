import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { errors } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { ean13CheckDigit } from "@/lib/barcode";
import { postStockMovement, nextNumber } from "./stock";
import {
  getCustomFieldValuesForEntities,
  prepareCustomFieldValues,
  saveCustomFieldValues,
  summarizeCustomFields,
} from "@/server/custom-fields/service";
import type {
  AdjustmentCreate,
  ProductCreate,
} from "./schemas";

const D = (n: Prisma.Decimal.Value) => new Prisma.Decimal(n);
const orNull = (v: string | undefined) => (v && v.length ? v : null);

/* ───────────────────────────  Categories  ────────────────────────── */

export async function listCategories(companyId: string) {
  const rows = await db.productCategory.findMany({
    where: { companyId, deletedAt: null },
    orderBy: { name: "asc" },
    select: {
      id: true, name: true, parentId: true, description: true, isActive: true,
      _count: { select: { products: true } },
    },
  });
  return rows.map((r) => ({ ...r, productCount: r._count.products }));
}

export async function createCategory(
  companyId: string,
  actorId: string,
  input: { name: string; parentId?: string; description?: string },
) {
  const dup = await db.productCategory.findFirst({
    where: { companyId, name: input.name, deletedAt: null },
  });
  if (dup) throw errors.conflict(`Category "${input.name}" already exists`);
  const created = await db.productCategory.create({
    data: {
      companyId,
      name: input.name,
      parentId: orNull(input.parentId),
      description: orNull(input.description),
    },
  });
  await writeAudit({ userId: actorId, companyId, action: "CREATE", entity: "ProductCategory", entityId: created.id });
  return created;
}

export async function updateCategory(
  companyId: string,
  actorId: string,
  id: string,
  input: { name?: string; parentId?: string; description?: string; isActive?: boolean },
) {
  const existing = await db.productCategory.findFirst({ where: { id, companyId, deletedAt: null } });
  if (!existing) throw errors.notFound("Category not found");
  if (input.parentId === id) throw errors.badRequest("A category cannot be its own parent");
  const updated = await db.productCategory.update({
    where: { id },
    data: {
      name: input.name ?? undefined,
      parentId: input.parentId === undefined ? undefined : orNull(input.parentId),
      description: input.description === undefined ? undefined : orNull(input.description),
      isActive: input.isActive ?? undefined,
    },
  });
  await writeAudit({ userId: actorId, companyId, action: "UPDATE", entity: "ProductCategory", entityId: id });
  return updated;
}

export async function deleteCategory(companyId: string, actorId: string, id: string) {
  const cat = await db.productCategory.findFirst({
    where: { id, companyId, deletedAt: null },
    select: { _count: { select: { products: true, children: true } } },
  });
  if (!cat) throw errors.notFound("Category not found");
  if (cat._count.products > 0 || cat._count.children > 0)
    throw errors.conflict("Category is in use (has products or sub-categories)");
  await db.productCategory.update({ where: { id }, data: { deletedAt: new Date() } });
  await writeAudit({ userId: actorId, companyId, action: "DELETE", entity: "ProductCategory", entityId: id });
}

/* ─────────────────────────────  Units  ───────────────────────────── */

export async function listUnits(companyId: string) {
  return db.unit.findMany({
    where: { companyId },
    orderBy: [{ isSystem: "desc" }, { name: "asc" }],
    select: { id: true, name: true, shortName: true, description: true, acceptFraction: true, isSystem: true, isActive: true },
  });
}

export async function createUnit(
  companyId: string,
  actorId: string,
  input: { name: string; shortName: string; description?: string; acceptFraction?: boolean },
) {
  const dup = await db.unit.findFirst({ where: { companyId, name: input.name } });
  if (dup) throw errors.conflict(`Unit "${input.name}" already exists`);
  const created = await db.unit.create({
    data: {
      companyId, name: input.name, shortName: input.shortName,
      description: orNull(input.description), acceptFraction: input.acceptFraction ?? false,
    },
  });
  await writeAudit({ userId: actorId, companyId, action: "CREATE", entity: "Unit", entityId: created.id });
  return created;
}

export async function updateUnit(
  companyId: string,
  actorId: string,
  id: string,
  input: { name?: string; shortName?: string; description?: string; acceptFraction?: boolean },
) {
  const existing = await db.unit.findFirst({ where: { id, companyId } });
  if (!existing) throw errors.notFound("Unit not found");
  const updated = await db.unit.update({
    where: { id },
    data: {
      name: input.name ?? undefined,
      shortName: input.shortName ?? undefined,
      description: input.description === undefined ? undefined : orNull(input.description),
      acceptFraction: input.acceptFraction ?? undefined,
    },
  });
  await writeAudit({ userId: actorId, companyId, action: "UPDATE", entity: "Unit", entityId: id });
  return updated;
}

/* ───────────────────────────  Warehouses  ────────────────────────── */

export async function listWarehouses(companyId: string) {
  const rows = await db.warehouse.findMany({
    where: { companyId, deletedAt: null },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    select: { id: true, name: true, address: true, phone: true, isDefault: true, isActive: true },
  });
  return rows;
}

export async function createWarehouse(
  companyId: string,
  actorId: string,
  input: { name: string; address?: string; phone?: string },
) {
  const dup = await db.warehouse.findFirst({ where: { companyId, name: input.name, deletedAt: null } });
  if (dup) throw errors.conflict(`Warehouse "${input.name}" already exists`);
  const count = await db.warehouse.count({ where: { companyId, deletedAt: null } });
  const created = await db.warehouse.create({
    data: {
      companyId, name: input.name, address: orNull(input.address),
      phone: orNull(input.phone), isDefault: count === 0,
    },
  });
  await writeAudit({ userId: actorId, companyId, action: "CREATE", entity: "Warehouse", entityId: created.id });
  return created;
}

export async function updateWarehouse(
  companyId: string,
  actorId: string,
  id: string,
  input: { name?: string; address?: string; phone?: string },
) {
  const existing = await db.warehouse.findFirst({ where: { id, companyId, deletedAt: null } });
  if (!existing) throw errors.notFound("Warehouse not found");
  const updated = await db.warehouse.update({
    where: { id },
    data: {
      name: input.name ?? undefined,
      address: input.address === undefined ? undefined : orNull(input.address),
      phone: input.phone === undefined ? undefined : orNull(input.phone),
    },
  });
  await writeAudit({ userId: actorId, companyId, action: "UPDATE", entity: "Warehouse", entityId: id });
  return updated;
}

/* ────────────────────────────  Products  ─────────────────────────── */

export async function listProducts(
  companyId: string,
  opts: { kind?: "GOODS" | "SERVICE" | "EXPENSE"; search?: string; categoryId?: string; page?: number } = {},
) {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = 20;
  const where: Prisma.ProductWhereInput = {
    companyId,
    deletedAt: null,
    ...(opts.kind ? { kind: opts.kind } : {}),
    ...(opts.categoryId ? { categoryId: opts.categoryId } : {}),
    ...(opts.search
      ? { OR: [{ name: { contains: opts.search, mode: "insensitive" } }, { sku: { contains: opts.search, mode: "insensitive" } }] }
      : {}),
  };
  const [rows, total] = await Promise.all([
    db.product.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true, sku: true, name: true, kind: true, sellingPrice: true, purchasePrice: true,
        category: { select: { name: true } },
        unit: { select: { shortName: true } },
        taxRate: { select: { name: true, ratePct: true } },
        isNonTaxable: true,
        barcodeValue: true,
      },
    }),
    db.product.count({ where }),
  ]);

  // on-hand for GOODS in this page
  const goodsIds = rows.filter((r) => r.kind === "GOODS").map((r) => r.id);
  const moves = goodsIds.length
    ? await db.stockMovement.groupBy({
        by: ["productId"],
        where: { companyId, productId: { in: goodsIds } },
        _sum: { qty: true },
      })
    : [];
  const qtyById = new Map(moves.map((m) => [m.productId, D(m._sum.qty ?? 0)]));
  const customByProduct = await getCustomFieldValuesForEntities(companyId, "PRODUCT", rows.map((r) => r.id));

  return {
    rows: rows.map((r) => ({
      id: r.id,
      sku: r.sku,
      name: r.name,
      kind: r.kind,
      category: r.category?.name ?? null,
      unit: r.unit.shortName,
      sellingPrice: r.sellingPrice.toFixed(2),
      purchasePrice: r.purchasePrice.toFixed(2),
      tax: r.isNonTaxable ? "Non-taxable" : r.taxRate?.name ?? "—",
      onHand: r.kind === "GOODS" ? (qtyById.get(r.id) ?? D(0)).toFixed(3) : null,
      barcodeValue: r.barcodeValue,
      customFieldsSummary: summarizeCustomFields(customByProduct.get(r.id)),
    })),
    total,
    page,
    pageSize,
  };
}

export async function createProduct(
  companyId: string,
  fiscalYearId: string | null,
  actorId: string,
  input: ProductCreate,
) {
  return db.$transaction(async (tx) => {
    const dup = await tx.product.findFirst({
      where: { companyId, sku: input.sku, deletedAt: null },
    });
    if (dup) throw errors.conflict(`SKU "${input.sku}" is already used`);

    const customFieldValues = await prepareCustomFieldValues(companyId, "PRODUCT", input.customFields, tx);

    const product = await tx.product.create({
      data: {
        companyId,
        kind: input.kind,
        name: input.name,
        categoryId: orNull(input.categoryId),
        hsnCode: orNull(input.hsnCode),
        sku: input.sku,
        reorderPoint: input.reorderPoint === undefined ? null : D(input.reorderPoint),
        description: orNull(input.description),
        unitId: input.unitId,
        subUnitId: orNull(input.subUnitId),
        subUnitConversion:
          input.subUnitConversion === undefined ? null : D(input.subUnitConversion),
        tertiaryUnitId: orNull(input.tertiaryUnitId),
        tertiaryConversion:
          input.tertiaryConversion === undefined ? null : D(input.tertiaryConversion),
        purchasePrice: D(input.purchasePrice ?? 0),
        sellingPrice: D(input.sellingPrice ?? 0),
        taxRateId: input.isNonTaxable ? null : orNull(input.taxRateId),
        taxBasis: input.taxBasis,
        isNonTaxable: input.isNonTaxable,
        inventoryRole: input.inventoryRole,
        size: orNull(input.size),
        color: orNull(input.color),
        flavour: orNull(input.flavour),
        dftqcNo: orNull(input.dftqcNo),
        madeImportedFrom: orNull(input.madeImportedFrom),
        expiryDate: input.expiryDate ? new Date(input.expiryDate) : null,
      },
    });

    if (input.kind === "GOODS" && input.openingQty && input.openingQty > 0) {
      const warehouseId =
        orNull(input.openingWarehouseId) ??
        (await tx.warehouse.findFirst({
          where: { companyId, deletedAt: null },
          orderBy: { isDefault: "desc" },
          select: { id: true },
        }))?.id;
      if (!warehouseId) throw errors.badRequest("Create a warehouse before adding opening stock");
      await postStockMovement(tx, {
        companyId,
        fiscalYearId,
        date: new Date(),
        kind: "OPENING",
        sourceType: "Product:opening",
        sourceId: product.id,
        createdById: actorId,
        allowNegative: true,
        lines: [
          {
            productId: product.id,
            warehouseId,
            qty: input.openingQty,
            unitCost: input.purchasePrice ?? 0,
          },
        ],
      });
    }

    if (customFieldValues.length) await saveCustomFieldValues(tx, companyId, product.id, customFieldValues);

    await writeAudit({
      userId: actorId, companyId, action: "CREATE", entity: "Product", entityId: product.id,
      meta: { sku: product.sku, name: product.name, kind: product.kind },
    });
    return product;
  });
}

export async function getProduct(companyId: string, id: string) {
  const p = await db.product.findFirst({
    where: { id, companyId, deletedAt: null },
    include: {
      category: { select: { id: true, name: true } },
      unit: { select: { id: true, name: true, shortName: true } },
      subUnit: { select: { id: true, name: true } },
      tertiaryUnit: { select: { id: true, name: true } },
      taxRate: { select: { id: true, name: true } },
    },
  });
  if (!p) throw errors.notFound("Product not found");
  return p;
}

export async function updateProduct(
  companyId: string,
  actorId: string,
  id: string,
  input: Partial<ProductCreate>,
) {
  const existing = await db.product.findFirst({ where: { id, companyId, deletedAt: null } });
  if (!existing) throw errors.notFound("Product not found");
  const updated = await db.product.update({
    where: { id },
    data: {
      name: input.name ?? undefined,
      categoryId: input.categoryId === undefined ? undefined : orNull(input.categoryId),
      hsnCode: input.hsnCode === undefined ? undefined : orNull(input.hsnCode),
      reorderPoint:
        input.reorderPoint === undefined ? undefined : input.reorderPoint === null ? null : D(input.reorderPoint),
      description: input.description === undefined ? undefined : orNull(input.description),
      purchasePrice: input.purchasePrice === undefined ? undefined : D(input.purchasePrice),
      sellingPrice: input.sellingPrice === undefined ? undefined : D(input.sellingPrice),
      taxRateId: input.taxRateId === undefined ? undefined : orNull(input.taxRateId),
      taxBasis: input.taxBasis ?? undefined,
      isNonTaxable: input.isNonTaxable ?? undefined,
      inventoryRole: input.inventoryRole ?? undefined,
      size: input.size === undefined ? undefined : orNull(input.size),
      color: input.color === undefined ? undefined : orNull(input.color),
      flavour: input.flavour === undefined ? undefined : orNull(input.flavour),
    },
  });
  await writeAudit({ userId: actorId, companyId, action: "UPDATE", entity: "Product", entityId: id });
  return updated;
}

/** Claims the next barcode value from Settings › Barcode's prefix+counter and
 * assigns it to the product permanently (re-calling this on an already-tagged
 * product is a no-op — it returns the existing value rather than burning
 * another number). Increments BarcodeSetting.nextNumber atomically.
 *
 * EAN13 needs exactly 13 numeric digits (12 data + 1 check digit), but the
 * setting's `prefix` is free text (e.g. "BELA") meant for CODE128 labels — so
 * for EAN13 only the prefix's digit characters are kept, packed into the
 * first 6 digits (zero-padded/truncated) with the counter's last 6 digits
 * filling the rest, then a real GS1 check digit is computed and appended.
 * This keeps the same "prefix + 6-digit counter" shape the setting already
 * implies while guaranteeing a scannable, checksum-valid EAN13 value. */
export async function generateProductBarcode(companyId: string, actorId: string, productId: string) {
  return db.$transaction(async (tx) => {
    const product = await tx.product.findFirst({ where: { id: productId, companyId, deletedAt: null } });
    if (!product) throw errors.notFound("Product not found");
    if (product.barcodeValue) return product;

    const setting = await tx.barcodeSetting.upsert({
      where: { companyId },
      create: { companyId },
      update: {},
    });
    let value: string;
    if (setting.symbology === "EAN13") {
      const prefixDigits = (setting.prefix ?? "").replace(/\D/g, "").slice(0, 6).padStart(6, "0");
      const counterDigits = String(setting.nextNumber % 1_000_000).padStart(6, "0");
      const body = prefixDigits + counterDigits;
      value = body + ean13CheckDigit(body);
    } else {
      value = `${setting.prefix ?? ""}${String(setting.nextNumber).padStart(6, "0")}`;
    }

    const [updated] = await Promise.all([
      tx.product.update({ where: { id: productId }, data: { barcodeValue: value } }),
      tx.barcodeSetting.update({ where: { companyId }, data: { nextNumber: setting.nextNumber + 1 } }),
    ]);
    await writeAudit({ userId: actorId, companyId, action: "UPDATE", entity: "Product", entityId: productId, meta: { barcodeValue: value } });
    return updated;
  });
}

/* ───────────────────────  Inventory adjustment  ──────────────────── */

export async function listAdjustments(companyId: string, page = 1) {
  const pageSize = 10;
  const [rows, total] = await Promise.all([
    db.inventoryAdjustment.findMany({
      where: { companyId },
      orderBy: [{ date: "desc" }, { number: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true, number: true, date: true, type: true, notes: true,
        _count: { select: { lines: true } },
      },
    }),
    db.inventoryAdjustment.count({ where: { companyId } }),
  ]);
  return {
    rows: rows.map((r) => ({
      id: r.id,
      number: r.number,
      date: r.date.toISOString().slice(0, 10),
      type: r.type,
      notes: r.notes,
      lineCount: r._count.lines,
    })),
    total,
    page,
    pageSize,
  };
}

export async function createAdjustment(
  companyId: string,
  fiscalYearId: string | null,
  actorId: string,
  input: AdjustmentCreate,
) {
  return db.$transaction(async (tx) => {
    const fy = fiscalYearId
      ? fiscalYearId
      : (await tx.fiscalYear.findFirst({ where: { companyId, active: true }, select: { id: true } }))?.id ?? null;

    const seq = await nextNumber(tx, companyId, fy ?? "none", "inventory_adjustment");
    const number = `ADJ-${String(seq).padStart(5, "0")}`;

    const inLines = input.lines.filter((l) => l.qty > 0);
    const outLines = input.lines.filter((l) => l.qty < 0);
    if (inLines.length === 0 && outLines.length === 0)
      throw errors.validation(null, "Every line needs a non-zero quantity");

    const adj = await tx.inventoryAdjustment.create({
      data: {
        companyId,
        number,
        date: new Date(input.date),
        type: input.type,
        warehouseId: input.warehouseId,
        notes: orNull(input.notes),
        createdById: actorId,
        lines: {
          create: input.lines.map((l, i) => ({
            productId: l.productId,
            batchId: orNull(l.batchId),
            qty: D(l.qty),
            order: i,
          })),
        },
      },
    });

    if (inLines.length)
      await postStockMovement(tx, {
        companyId, fiscalYearId: fy, date: new Date(input.date), kind: "ADJUSTMENT_IN",
        sourceType: "InventoryAdjustment", sourceId: adj.id, createdById: actorId, allowNegative: true,
        lines: inLines.map((l) => ({
          productId: l.productId, warehouseId: input.warehouseId,
          batchId: orNull(l.batchId), qty: Math.abs(l.qty),
        })),
      });

    if (outLines.length)
      await postStockMovement(tx, {
        companyId, fiscalYearId: fy, date: new Date(input.date), kind: "ADJUSTMENT_OUT",
        sourceType: "InventoryAdjustment", sourceId: adj.id, createdById: actorId,
        lines: outLines.map((l) => ({
          productId: l.productId, warehouseId: input.warehouseId,
          batchId: orNull(l.batchId), qty: Math.abs(l.qty),
        })),
      });

    await writeAudit({
      userId: actorId, companyId, action: "CREATE", entity: "InventoryAdjustment", entityId: adj.id,
      meta: { number, type: input.type },
    });
    return adj;
  });
}
