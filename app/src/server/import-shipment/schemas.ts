import { z } from "zod";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");

export const importShipmentCreate = z
  .object({
    date: isoDate,
    supplierLedgerId: z.string().optional().or(z.literal("")),
    supplierName: z.string().max(160).optional().or(z.literal("")),
    countryOfOrigin: z.string().max(80).optional().or(z.literal("")),
    billOfEntryNo: z.string().max(60).optional().or(z.literal("")),
    portOfEntry: z.string().max(80).optional().or(z.literal("")),
    purchaseInvoiceId: z.string().optional().or(z.literal("")),
    notes: z.string().max(500).optional().or(z.literal("")),
  })
  .refine((v) => v.supplierLedgerId || v.supplierName, {
    message: "Select a supplier or enter a name",
    path: ["supplierLedgerId"],
  });

export type ImportShipmentCreate = z.infer<typeof importShipmentCreate>;
