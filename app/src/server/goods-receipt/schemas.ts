import { z } from "zod";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");

export const goodsReceiptCreate = z
  .object({
    date: isoDate,
    supplierLedgerId: z.string().optional().or(z.literal("")),
    supplierName: z.string().max(160).optional().or(z.literal("")),
    purchaseOrderId: z.string().optional().or(z.literal("")),
    notes: z.string().max(500).optional().or(z.literal("")),
    items: z
      .array(
        z.object({
          productId: z.string().optional().or(z.literal("")),
          description: z.string().min(1).max(300),
          qtyOrdered: z.coerce.number().min(0).optional(),
          qtyReceived: z.coerce.number().positive(),
        }),
      )
      .min(1),
  })
  .refine((v) => v.supplierLedgerId || v.supplierName, {
    message: "Select a supplier or enter a name",
    path: ["supplierLedgerId"],
  });

export type GoodsReceiptCreate = z.infer<typeof goodsReceiptCreate>;
