import { z } from "zod";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");

export const chalaniCreate = z
  .object({
    date: isoDate,
    customerLedgerId: z.string().optional().or(z.literal("")),
    customerName: z.string().max(160).optional().or(z.literal("")),
    salesDocId: z.string().optional().or(z.literal("")),
    vehicleNo: z.string().max(30).optional().or(z.literal("")),
    driverName: z.string().max(120).optional().or(z.literal("")),
    notes: z.string().max(500).optional().or(z.literal("")),
    items: z
      .array(
        z.object({
          productId: z.string().optional().or(z.literal("")),
          description: z.string().min(1).max(300),
          qty: z.coerce.number().positive(),
        }),
      )
      .min(1),
  })
  .refine((v) => v.customerLedgerId || v.customerName, {
    message: "Select a customer or enter a name",
    path: ["customerLedgerId"],
  });

export type ChalaniCreate = z.infer<typeof chalaniCreate>;
