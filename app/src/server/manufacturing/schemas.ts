import { z } from "zod";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");

export const bomComponentInput = z.object({
  componentProductId: z.string().min(1),
  qtyPerBatch: z.coerce.number().positive(),
});

export const bomCreate = z.object({
  outputProductId: z.string().min(1, "Select the finished-goods product this BOM produces"),
  name: z.string().min(1).max(160),
  outputQty: z.coerce.number().positive().default(1),
  laborCostPerBatch: z.coerce.number().min(0).default(0),
  notes: z.string().max(500).optional().or(z.literal("")),
  components: z.array(bomComponentInput).min(1, "Add at least one component"),
});

export const productionOrderCreate = z.object({
  date: isoDate,
  bomId: z.string().min(1),
  warehouseId: z.string().min(1),
  batches: z.coerce.number().positive(),
  notes: z.string().max(500).optional().or(z.literal("")),
});

export type BomCreate = z.infer<typeof bomCreate>;
export type ProductionOrderCreate = z.infer<typeof productionOrderCreate>;
