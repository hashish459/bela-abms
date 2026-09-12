import { z } from "zod";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");

export const warehouseTransferCreate = z
  .object({
    date: isoDate,
    fromWarehouseId: z.string().min(1, "Select the source warehouse"),
    toWarehouseId: z.string().min(1, "Select the destination warehouse"),
    notes: z.string().max(500).optional().or(z.literal("")),
    items: z
      .array(
        z.object({
          productId: z.string().min(1),
          qty: z.coerce.number().positive(),
        }),
      )
      .min(1),
  })
  .refine((v) => v.fromWarehouseId !== v.toWarehouseId, {
    message: "Source and destination warehouse must be different",
    path: ["toWarehouseId"],
  });

export type WarehouseTransferCreate = z.infer<typeof warehouseTransferCreate>;
