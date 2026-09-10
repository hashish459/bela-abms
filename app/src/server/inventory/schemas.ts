import { z } from "zod";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");

export const categoryCreate = z.object({
  name: z.string().min(1).max(120),
  parentId: z.string().optional().or(z.literal("")),
  description: z.string().max(300).optional().or(z.literal("")),
});
export const categoryUpdate = categoryCreate.partial();

export const unitCreate = z.object({
  name: z.string().min(1).max(60),
  shortName: z.string().min(1).max(20),
  description: z.string().max(200).optional().or(z.literal("")),
  acceptFraction: z.boolean().default(false),
});
export const unitUpdate = unitCreate.partial();

export const warehouseCreate = z.object({
  name: z.string().min(1).max(120),
  address: z.string().max(300).optional().or(z.literal("")),
  phone: z.string().max(30).optional().or(z.literal("")),
});
export const warehouseUpdate = warehouseCreate.partial();

export const productCreate = z.object({
  kind: z.enum(["GOODS", "SERVICE", "EXPENSE"]).default("GOODS"),
  name: z.string().min(1).max(200),
  categoryId: z.string().optional().or(z.literal("")),
  hsnCode: z.string().max(20).optional().or(z.literal("")),
  sku: z.string().min(1).max(60),
  reorderPoint: z.coerce.number().min(0).optional(),
  description: z.string().max(500).optional().or(z.literal("")),

  unitId: z.string().min(1),
  subUnitId: z.string().optional().or(z.literal("")),
  subUnitConversion: z.coerce.number().positive().optional(),
  tertiaryUnitId: z.string().optional().or(z.literal("")),
  tertiaryConversion: z.coerce.number().positive().optional(),

  purchasePrice: z.coerce.number().min(0).default(0),
  sellingPrice: z.coerce.number().min(0).default(0),

  taxRateId: z.string().optional().or(z.literal("")),
  taxBasis: z.enum(["INCLUSIVE", "EXCLUSIVE"]).default("EXCLUSIVE"),
  isNonTaxable: z.boolean().default(false),

  size: z.string().max(60).optional().or(z.literal("")),
  color: z.string().max(60).optional().or(z.literal("")),
  flavour: z.string().max(60).optional().or(z.literal("")),
  dftqcNo: z.string().max(60).optional().or(z.literal("")),
  madeImportedFrom: z.string().max(120).optional().or(z.literal("")),
  expiryDate: isoDate.optional().or(z.literal("")),

  // Opening stock (GOODS only)
  openingQty: z.coerce.number().min(0).optional(),
  openingWarehouseId: z.string().optional().or(z.literal("")),
});
export const productUpdate = productCreate.partial();

const adjustmentLine = z.object({
  productId: z.string().min(1),
  batchId: z.string().optional().or(z.literal("")),
  qty: z.coerce.number(), // signed: + increase, - decrease
});

export const adjustmentCreate = z.object({
  date: isoDate,
  type: z.enum(["INCREASE", "DECREASE", "DAMAGE", "EXPIRY", "RECOUNT", "OPENING"]),
  warehouseId: z.string().min(1),
  notes: z.string().max(500).optional().or(z.literal("")),
  lines: z.array(adjustmentLine).min(1),
});

export type ProductCreate = z.infer<typeof productCreate>;
export type AdjustmentCreate = z.infer<typeof adjustmentCreate>;
